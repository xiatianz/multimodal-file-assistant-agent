/**
 * Model & Gateway configuration
 */

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';

export function resolveModelName(env?: Record<string, string | undefined>): string {
  return env?.AI_GATEWAY_MODEL || DEFAULT_MODEL;
}

/**
 * Map EdgeOne AI Gateway env vars to the names the Claude Agent SDK expects.
 * Returns a Record to be merged into query() options.env — does NOT mutate process.env.
 */
export function collectGatewayEnv(env: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  const gatewayType = env.AI_GATEWAY_TYPE;
  const baseUrl = env.AI_GATEWAY_BASE_URL;
  
  if (baseUrl) {
    if (gatewayType === 'openai') {
      const separator = baseUrl.includes('?') ? '&' : '?';
      result.ANTHROPIC_BASE_URL = baseUrl + separator + '__gw_type=openai';
    } else {
      result.ANTHROPIC_BASE_URL = baseUrl;
    }
  } else if (gatewayType === 'openai') {
    result.ANTHROPIC_BASE_URL = 'https://api.openai.com/v1?__gw_type=openai';
  }
  
  if (env.AI_GATEWAY_API_KEY) {
    result.ANTHROPIC_API_KEY = env.AI_GATEWAY_API_KEY;
  }
  
  if (env.ANTHROPIC_CUSTOM_HEADERS) {
    result.ANTHROPIC_CUSTOM_HEADERS = env.ANTHROPIC_CUSTOM_HEADERS;
  }
  return result;
}


// ============ OpenAI Compatible Protocol Translator Shim ============
// Intercepts the Claude Agent SDK's outgoing Anthropic Messages API calls 
// and translates them to standard OpenAI Chat Completions on the fly.
if (typeof globalThis !== 'undefined') {
  const originalFetch = globalThis.fetch;
  
  globalThis.fetch = async function (url: string | URL | Request, options?: RequestInit) {
    const urlStr = typeof url === 'string' ? url : 'url' in url ? url.url : url.toString();
    const isMessagesCall = urlStr.includes('/v1/messages');
    
    const isOpenAI = urlStr.includes('__gw_type=openai') || process.env.AI_GATEWAY_TYPE === 'openai';
    
    if (isMessagesCall && isOpenAI && options?.body) {
      try {
        const anthropicPayload = JSON.parse(options.body as string);
        const model = anthropicPayload.model;
        const system = anthropicPayload.system;
        const messages = anthropicPayload.messages;
        const tools = anthropicPayload.tools;
        const stream = anthropicPayload.stream;
        
        // 1. Translate Messages to OpenAI format
        const openaiMessages: any[] = [];
        if (system) {
          openaiMessages.push({ role: 'system', content: system });
        }
        
        for (const msg of messages) {
          const role = msg.role;
          if (typeof msg.content === 'string') {
            openaiMessages.push({ role, content: msg.content });
          } else if (Array.isArray(msg.content)) {
            const textBlocks: string[] = [];
            const toolCalls: any[] = [];
            
            for (const block of msg.content) {
              if (block.type === 'text') {
                textBlocks.push(block.text);
              } else if (block.type === 'tool_use') {
                toolCalls.push({
                  id: block.id,
                  type: 'function',
                  function: {
                    name: block.name,
                    arguments: JSON.stringify(block.input)
                  }
                });
              } else if (block.type === 'tool_result') {
                let contentStr = "";
                if (typeof block.content === 'string') {
                  contentStr = block.content;
                } else if (Array.isArray(block.content)) {
                  contentStr = block.content.map((b: any) => b.text || "").join("\n");
                }
                openaiMessages.push({
                  role: 'tool',
                  tool_call_id: block.tool_use_id,
                  name: block.name || 'tool',
                  content: contentStr
                });
              }
            }
            
            if (textBlocks.length > 0 || toolCalls.length > 0) {
              const item: any = { role };
              if (textBlocks.length > 0) {
                item.content = textBlocks.join("\n");
              }
              if (toolCalls.length > 0) {
                item.tool_calls = toolCalls;
                if (!item.content) item.content = null;
              }
              openaiMessages.push(item);
            }
          }
        }
        
        // 2. Translate Tools to OpenAI format
        let openaiTools = undefined;
        if (tools && tools.length > 0) {
          openaiTools = tools.map((t: any) => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description || "",
              parameters: t.input_schema
            }
          }));
        }
        
        const openaiPayload = {
          model: model,
          messages: openaiMessages,
          tools: openaiTools,
          stream: stream ?? true
        };
        
        // 3. Prepare headers
        const gatewayHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Extract key from headers
        let anthropicApiKey = null;
        if (options?.headers) {
          if (typeof (options.headers as any).get === 'function') {
            anthropicApiKey = (options.headers as any).get('x-api-key');
          } else if (Array.isArray(options.headers)) {
            for (const [k, v] of options.headers) {
              if (k.toLowerCase() === 'x-api-key') anthropicApiKey = v;
            }
          } else {
            anthropicApiKey = (options.headers as any)['x-api-key'] || (options.headers as any)['X-Api-Key'];
          }
        }
        
        const apiKey = anthropicApiKey || process.env.AI_GATEWAY_API_KEY;
        if (apiKey) {
          gatewayHeaders['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // Clean URL to build target URL
        const parsedUrl = new URL(urlStr);
        let targetBase = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
        // Remove /messages
        targetBase = targetBase.replace(/\/messages\/?$/, '');
        const targetUrl = `${targetBase}/chat/completions`;
        
        // 4. Fetch from OpenAI endpoint
        const response = await originalFetch(targetUrl, {
          method: 'POST',
          headers: gatewayHeaders,
          body: JSON.stringify(openaiPayload),
          signal: options.signal
        });
        
        if (!response.ok) {
          return response; // forward error responses directly
        }
        
        if (!response.body) {
          return response;
        }
        
        // 5. Transform OpenAI stream back to Anthropic event stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        
        const newStream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            let messageId = "msg_" + Math.random().toString(36).slice(2, 10);
            
            // Send initial message_start
            const msgStart = {
              type: "message_start",
              message: {
                id: messageId,
                type: "message",
                role: "assistant",
                content: [],
                model: openaiPayload.model,
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 0, output_tokens: 0 }
              }
            };
            controller.enqueue(encoder.encode(`event: message_start\ndata: ${JSON.stringify(msgStart)}\n\n`));
            
            let textBlockStarted = false;
            const startedToolIndexes = new Set<number>();
            const activeToolIds = new Map<number, string>();
            const activeToolNames = new Map<number, string>();
            const activeToolInputs = new Map<number, string>();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                
                for (const line of lines) {
                  const cleanLine = line.trim();
                  if (!cleanLine) continue;
                  if (cleanLine === "data: [DONE]") continue;
                  if (!cleanLine.startsWith("data: ")) continue;
                  
                  try {
                    const chunk = JSON.parse(cleanLine.slice(6));
                    const delta = chunk.choices?.[0]?.delta;
                    if (!delta) continue;
                    
                    // Handle text delta
                    if (delta.content) {
                      if (!textBlockStarted) {
                        textBlockStarted = true;
                        const blockStart = {
                          type: "content_block_start",
                          index: 0,
                          content_block: { type: "text", text: "" }
                        };
                        controller.enqueue(encoder.encode(`event: content_block_start\ndata: ${JSON.stringify(blockStart)}\n\n`));
                      }
                      const blockDelta = {
                        type: "content_block_delta",
                        index: 0,
                        delta: { type: "text_delta", text: delta.content }
                      };
                      controller.enqueue(encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify(blockDelta)}

`));
                    }
                    
                    // Handle tool call delta
                    if (delta.tool_calls && delta.tool_calls.length > 0) {
                      for (const tc of delta.tool_calls) {
                        const idx = tc.index ?? 0;
                        const toolIndex = idx + 1; // shift by 1 as text is 0
                        
                        if (!startedToolIndexes.has(toolIndex)) {
                          startedToolIndexes.add(toolIndex);
                          activeToolIds.set(toolIndex, tc.id || `toolu_${Math.random().toString(36).slice(2, 10)}`);
                          activeToolNames.set(toolIndex, tc.function?.name || "");
                          activeToolInputs.set(toolIndex, "");
                          
                          const blockStart = {
                            type: "content_block_start",
                            index: toolIndex,
                            content_block: {
                              type: "tool_use",
                              id: activeToolIds.get(toolIndex),
                              name: activeToolNames.get(toolIndex),
                              input: {}
                            }
                          };
                          controller.enqueue(encoder.encode(`event: content_block_start\ndata: ${JSON.stringify(blockStart)}\n\n`));
                        }
                        
                        if (tc.function?.arguments) {
                          activeToolInputs.set(toolIndex, activeToolInputs.get(toolIndex)! + tc.function.arguments);
                          const blockDelta = {
                            type: "content_block_delta",
                            index: toolIndex,
                            delta: {
                              type: "input_json_delta",
                              partial_json: tc.function.arguments
                            }
                          };
                          controller.enqueue(encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify(blockDelta)}

`));
                        }
                      }
                    }
                  } catch (e) {
                    // skip malformed chunks
                  }
                }
              }
              
              // End content blocks
              if (textBlockStarted) {
                const blockStop = { type: "content_block_stop", index: 0 };
                controller.enqueue(encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify(blockStop)}
\n`));
              }
              for (const toolIndex of startedToolIndexes) {
                const blockStop = { type: "content_block_stop", index: toolIndex };
                controller.enqueue(encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify(blockStop)}
\n`));
              }
              
              // Send message_delta & message_stop
              const msgDelta = {
                type: "message_delta",
                delta: { stop_reason: startedToolIndexes.size > 0 ? "tool_use" : "end_turn", stop_sequence: null },
                usage: { output_tokens: 0 }
              };
              controller.enqueue(encoder.encode(`event: message_delta\ndata: ${JSON.stringify(msgDelta)}
\n`));
              
              const msgStop = { type: "message_stop" };
              controller.enqueue(encoder.encode(`event: message_stop\ndata: ${JSON.stringify(msgStop)}
\n`));
              
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          }
        });
        
        return new Response(newStream, {
          status: response.status,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      } catch (err) {
        console.error("Local OpenAI protocol translation error:", err);
      }
    }
    
    return originalFetch(url, options);
  };
}
