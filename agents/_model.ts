import * as http from 'http';
import * as https from 'https';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';

export function resolveModelName(env?: Record<string, string | undefined>): string {
  return env?.AI_GATEWAY_MODEL || DEFAULT_MODEL;
}

const PROXY_PORT = 34999;
let proxyStarted = false;

if (typeof process !== 'undefined' && !proxyStarted) {
  proxyStarted = true;
  try {
    const server = http.createServer((req, res) => {
      const match = req.url?.match(/^\/([A-Za-z0-9+/=]+)\/v1\/messages/);
      if (!match) {
        res.writeHead(404);
        res.end();
        return;
      }
      
      let config: any = {};
      try {
        config = JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8'));
      } catch (e) {
        res.writeHead(400);
        res.end("Bad config");
        return;
      }
      
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const anthropicPayload = JSON.parse(body);
          
          const openaiMessages: any[] = [];
          if (anthropicPayload.system) {
            openaiMessages.push({ role: 'system', content: anthropicPayload.system });
          }
          
          for (const msg of (anthropicPayload.messages || [])) {
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
          
          let openaiTools = undefined;
          if (anthropicPayload.tools && anthropicPayload.tools.length > 0) {
            openaiTools = anthropicPayload.tools.map((t: any) => ({
              type: 'function',
              function: {
                name: t.name,
                description: t.description || "",
                parameters: t.input_schema
              }
            }));
          }
          
          const openaiPayload = {
            model: anthropicPayload.model,
            messages: openaiMessages,
            tools: openaiTools,
            stream: anthropicPayload.stream ?? true
          };
          
          let targetBase = config.url || 'https://api.openai.com/v1';
          if (targetBase.endsWith('/')) targetBase = targetBase.slice(0, -1);
          const targetUrl = `${targetBase}/chat/completions`;
          
          const targetUrlObj = new URL(targetUrl);
          const requestModule = targetUrlObj.protocol === 'https:' ? https : http;
          
          const proxyReq = requestModule.request(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.key}`
            }
          }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            });
            
            let buffer = '';
            let messageId = "msg_" + Math.random().toString(36).slice(2, 10);
            
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
            res.write(`event: message_start\ndata: ${JSON.stringify(msgStart)}\n\n`);
            
            let textBlockStarted = false;
            const startedToolIndexes = new Set<number>();
            const activeToolIds = new Map<number, string>();
            const activeToolNames = new Map<number, string>();
            const activeToolInputs = new Map<number, string>();
            
            proxyRes.on('data', (chunk) => {
              buffer += chunk.toString('utf-8');
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              
              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                if (cleanLine === "data: [DONE]") continue;
                if (!cleanLine.startsWith("data: ")) continue;
                
                try {
                  const chunkObj = JSON.parse(cleanLine.slice(6));
                  const delta = chunkObj.choices?.[0]?.delta;
                  if (!delta) continue;
                  
                  if (delta.content) {
                    if (!textBlockStarted) {
                      textBlockStarted = true;
                      const blockStart = {
                        type: "content_block_start",
                        index: 0,
                        content_block: { type: "text", text: "" }
                      };
                      res.write(`event: content_block_start\ndata: ${JSON.stringify(blockStart)}\n\n`);
                    }
                    const blockDelta = {
                      type: "content_block_delta",
                      index: 0,
                      delta: { type: "text_delta", text: delta.content }
                    };
                    res.write(`event: content_block_delta\ndata: ${JSON.stringify(blockDelta)}\n\n`);
                  }
                  
                  if (delta.tool_calls && delta.tool_calls.length > 0) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index ?? 0;
                      const toolIndex = idx + 1;
                      
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
                        res.write(`event: content_block_start\ndata: ${JSON.stringify(blockStart)}\n\n`);
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
                        res.write(`event: content_block_delta\ndata: ${JSON.stringify(blockDelta)}\n\n`);
                      }
                    }
                  }
                } catch (e) {}
              }
            });
            
            proxyRes.on('end', () => {
              if (textBlockStarted) {
                res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`);
              }
              for (const toolIndex of startedToolIndexes) {
                res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: toolIndex })}\n\n`);
              }
              
              const msgDelta = {
                type: "message_delta",
                delta: { stop_reason: startedToolIndexes.size > 0 ? "tool_use" : "end_turn", stop_sequence: null },
                usage: { output_tokens: 0 }
              };
              res.write(`event: message_delta\ndata: ${JSON.stringify(msgDelta)}\n\n`);
              res.write(`event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`);
              res.end();
            });
          });
          
          proxyReq.on('error', (err) => {
            console.error("Proxy request error:", err);
            res.writeHead(500);
            res.end();
          });
          
          proxyReq.write(JSON.stringify(openaiPayload));
          proxyReq.end();
          
        } catch(err) {
          console.error("Proxy payload parse error:", err);
          res.writeHead(500);
          res.end();
        }
      });
    });
    
    server.on('error', () => { /* Ignore EADDRINUSE if another instance already bound to it */ });
    server.listen(PROXY_PORT, '127.0.0.1');
  } catch (e) {}
}

export function collectGatewayEnv(env: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  
  const gatewayType = env.AI_GATEWAY_TYPE;
  const baseUrl = env.AI_GATEWAY_BASE_URL;
  const apiKey = env.AI_GATEWAY_API_KEY;
  
  if (gatewayType === 'openai') {
    const config = Buffer.from(JSON.stringify({ url: baseUrl, key: apiKey })).toString('base64');
    result.ANTHROPIC_BASE_URL = `http://127.0.0.1:${PROXY_PORT}/${config}`;
    result.ANTHROPIC_API_KEY = apiKey || 'dummy';
  } else {
    if (baseUrl) result.ANTHROPIC_BASE_URL = baseUrl;
    if (apiKey) result.ANTHROPIC_API_KEY = apiKey;
  }
  
  if (env.ANTHROPIC_CUSTOM_HEADERS) {
    result.ANTHROPIC_CUSTOM_HEADERS = env.ANTHROPIC_CUSTOM_HEADERS;
  }
  return result;
}
