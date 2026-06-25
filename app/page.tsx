'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { useI18n } from '@/lib/i18n';
import {
  MAX_FILES_PER_REQUEST,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  MAX_SINGLE_FILE_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  getUploadFileKind,
  humanFileSize,
  isSupportedUploadFileName,
} from '@/lib/file-policy';

// Configure marked for GFM tables
marked.setOptions({ gfm: true, breaks: true });

// ============ Types ============

export interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'word' | 'excel' | 'csv' | 'text';
  byteSize: number;
  size: string;
  mimeType?: string;
  width?: number;
  height?: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  base64?: string;
}

interface ThinkingStep {
  type: 'tool_call' | 'error';
  content: string;
}

interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'user' | 'text' | 'tool_call' | 'tool_output' | 'file_download' | 'error' | 'system' | 'suggestions' | 'thinking_group' | 'retry_card';
  content: string;
  meta?: Record<string, any>;
}

// ============ Markdown Renderer ============

function MarkdownBlock({ content }: { content: string }) {
  const html = marked.parse(content) as string;
  return <div className="prose-chat" dangerouslySetInnerHTML={{ __html: html }} />;
}

function StreamingText({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  // Always render Markdown in real time during streaming — marked.parse is
  // synchronous so every accumulated delta is parsed immediately.
  // A pulsing cursor is appended while still streaming.
  return (
    <div className="relative">
      <MarkdownBlock content={content} />
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-0.5 align-middle rounded-sm bg-current opacity-60 animate-pulse" />
      )}
    </div>
  );
}

// ============ Thinking Panel ============

function ThinkingPanel({
  steps,
  collapsed,
  isLive,
  onToggle,
  isDark,
  locale,
}: {
  steps: ThinkingStep[];
  collapsed: boolean;
  isLive: boolean;
  onToggle: () => void;
  isDark: boolean;
  locale: string;
}) {
  const isZh = locale === 'zh';
  const stepCount = steps.length;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-inset)] overflow-hidden text-xs">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-elevated)]"
      >
        {isLive ? (
          <span className="w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin flex-shrink-0" />
        ) : (
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-[var(--text-tertiary)]`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        <span className="font-medium text-[var(--text-secondary)]">
          {isLive
            ? (isZh ? '处理中...' : 'Processing...')
            : stepCount > 0
              ? (isZh ? `思考过程 · ${stepCount} 步` : `Thinking · ${stepCount} steps`)
              : (isZh ? '思考过程' : 'Thinking')}
        </span>
        {!isLive && stepCount > 0 && (
          <span className="ml-auto text-[var(--text-tertiary)]">
            {collapsed ? '▼' : '▲'}
          </span>
        )}
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="px-3 py-2.5 space-y-1.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                  step.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                }`}>
                  {step.type === 'error' ? 'ERR' : (isZh ? '操作' : 'ACT')}
                </span>
                <span className={`leading-relaxed ${
                  step.type === 'error'
                    ? 'text-red-600 dark:text-red-300/80'
                    : 'text-amber-700 dark:text-amber-200/70'
                }`}>{step.content}</span>
              </div>
            ))}
            {isLive && (
              <div className="flex items-center gap-1.5 pt-0.5 text-[var(--text-tertiary)]">
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                <span>{isZh ? '等待下一步...' : 'Waiting...'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Helpers ============

function getFileIcon(type: FileItem['type']): string {
  switch (type) {
    case 'pdf': return '📄';
    case 'word': return '📝';
    case 'excel': return '📊';
    case 'image': return '🖼️';
    case 'csv': return '📋';
    default: return '📃';
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image dimensions'));
    };
    img.src = url;
  });
}

function timeStr(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

function toolToAgentAction(tool: string, input: any, locale: string): string {
  const isZh = locale === 'zh';
  switch (tool) {
    case 'files': {
      const op = input?.op;
      const path = input?.path || '';
      const fname = path.split('/').pop();
      if (op === 'read') return isZh ? `📖 读取文件 ${fname}` : `📖 Reading ${fname}`;
      if (op === 'write') return isZh ? `✍️ 写入文件 ${fname}` : `✍️ Writing ${fname}`;
      if (op === 'list') return isZh ? `📂 列出目录 ${path}` : `📂 Listing ${path}`;
      if (op === 'exists') return isZh ? `🔍 检查文件 ${fname}` : `🔍 Checking ${fname}`;
      if (op === 'makeDir') return isZh ? `📁 创建目录 ${path}` : `📁 Creating dir ${path}`;
      if (op === 'remove') return isZh ? `🗑️ 删除文件 ${fname}` : `🗑️ Removing ${fname}`;
      return isZh ? `📄 文件操作: ${op}` : `📄 File op: ${op}`;
    }
    case 'commands': {
      const cmd = (input?.cmd || '').slice(0, 120);
      if (cmd.includes('pip install')) return isZh ? `📦 准备处理环境...` : `📦 Preparing environment...`;
      if (cmd.includes('base64')) return isZh ? `📤 准备文件下载` : `📤 Preparing download`;
      if (cmd.includes('file ') || cmd.includes('identify')) return isZh ? `🔍 检查文件信息` : `🔍 Checking file info`;
      return isZh ? `⚡ 正在处理...` : `⚡ Processing...`;
    }
    case 'code_interpreter': {
      const lang = input?.language || 'python';
      const code = (input?.code || '').slice(0, 80);
      if (code.includes('pandas') || code.includes('pd.read_csv')) return isZh ? `🐍 Python 数据分析中...` : `🐍 Python data analysis...`;
      if (code.includes('FPDF') || code.includes('fpdf')) return isZh ? `🐍 Python 生成 PDF...` : `🐍 Python generating PDF...`;
      if (code.includes('matplotlib') || code.includes('plt.')) return isZh ? `📊 Python 生成图表...` : `📊 Python creating chart...`;
      if (code.includes('docx') || code.includes('Document')) return isZh ? `🐍 Python 处理 Word 文档...` : `🐍 Python processing Word doc...`;
      if (code.includes('PIL') || code.includes('Image')) return isZh ? `🖼️ Python 处理图片...` : `🖼️ Python processing image...`;
      return isZh ? `🐍 ${lang} 代码执行中...` : `🐍 Running ${lang} code...`;
    }
    case 'deliver_file': {
      const fname = input?.filename || '';
      return isZh ? `📥 交付文件: ${fname}` : `📥 Delivering: ${fname}`;
    }
    default:
      return isZh ? `🔧 ${tool}` : `🔧 ${tool}`;
  }
}

// ============ Sample Files ============

function estimateImageSize(file: File, dimensions?: { width: number; height: number }): number {
  if (!dimensions) return file.size;
  const pixels = dimensions.width * dimensions.height;
  if (!pixels) return file.size;
  const inferredBytes = Math.max(file.size, Math.round(pixels * 0.35));
  return inferredBytes;
}

function getUploadAcceptString(): string {
  return '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,.txt,.md,.json,.xml,.html,.log,.yml,.yaml';
}

// ============ Main Component ============

export default function Home() {
  const { t, locale, setLocale } = useI18n();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const pendingAutoAnalyze = useRef(false);
  const activeRequestAbortRef = useRef<AbortController | null>(null);
  // Track which files have already been sent to avoid re-uploading
  const sentFileIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  const addActivity = useCallback((type: ActivityEntry['type'], content: string, meta?: Record<string, any>) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActivities((prev) => [...prev, { id, timestamp: Date.now(), type, content, meta }]);
  }, []);

  const resetToHome = useCallback(() => {
    activeRequestAbortRef.current?.abort();
    activeRequestAbortRef.current = null;
    setFiles([]);
    setActivities([]);
    setUserInput('');
    setIsProcessing(false);
    setWorkspaceOpen(false);
    setTokenUsage({ input: 0, output: 0 });
    pendingAutoAnalyze.current = false;
    sentFileIds.current.clear();
    setConversationId(crypto.randomUUID());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // File handling
  const processFiles = useCallback(async (selectedFiles: File[]) => {
    const queuedBytes = files
      .filter((f) => !sentFileIds.current.has(f.id))
      .reduce((sum, f) => sum + f.byteSize, 0);
    const queuedCount = files.filter((f) => !sentFileIds.current.has(f.id)).length;

    const accepted: FileItem[] = [];
    const rejected: string[] = [];
    let runningBytes = queuedBytes;
    const remainingSlots = Math.max(0, MAX_FILES_PER_REQUEST - queuedCount);

    for (const f of selectedFiles) {
      if (accepted.length >= remainingSlots) {
        rejected.push(
          locale === 'zh'
            ? `本次最多还能再加入 ${remainingSlots} 个文件。`
            : `You can only add ${remainingSlots} more file(s) right now.`
        );
        break;
      }
      const kind = getUploadFileKind(f.name);
      if (!isSupportedUploadFileName(f.name)) {
        rejected.push(
          locale === 'zh'
            ? `${f.name} 不在支持范围内。`
            : `${f.name} is not a supported file type.`
        );
        continue;
      }
      if (f.size > MAX_SINGLE_FILE_BYTES) {
        rejected.push(
          locale === 'zh'
            ? `${f.name} 超过单文件上限 ${humanFileSize(MAX_SINGLE_FILE_BYTES)}。`
            : `${f.name} exceeds the ${humanFileSize(MAX_SINGLE_FILE_BYTES)} per-file limit.`
        );
        continue;
      }
      if (runningBytes + f.size > MAX_TOTAL_UPLOAD_BYTES) {
        rejected.push(
          locale === 'zh'
            ? `本次上传总大小不能超过 ${humanFileSize(MAX_TOTAL_UPLOAD_BYTES)}。`
            : `This batch exceeds the ${humanFileSize(MAX_TOTAL_UPLOAD_BYTES)} total upload limit.`
        );
        continue;
      }

      let width: number | undefined;
      let height: number | undefined;
      if (kind === 'image') {
        try {
          const dims = await getImageDimensions(f);
          width = dims.width;
          height = dims.height;
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || (width * height) > MAX_IMAGE_PIXELS) {
            rejected.push(
              locale === 'zh'
                ? `${f.name} 分辨率过大，建议不超过 ${MAX_IMAGE_DIMENSION}px 且总像素不超过 ${(MAX_IMAGE_PIXELS / 1_000_000).toFixed(0)}MP。`
                : `${f.name} is too large. Please keep each side under ${MAX_IMAGE_DIMENSION}px and total pixels under ${(MAX_IMAGE_PIXELS / 1_000_000).toFixed(0)}MP.`
            );
            continue;
          }
        } catch {
          rejected.push(
            locale === 'zh'
              ? `${f.name} 不是可读取的图片文件。`
              : `${f.name} could not be read as an image.`
          );
          continue;
        }
      }

      const base64 = await readFileAsBase64(f);
      accepted.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: kind,
        byteSize: f.size,
        size: humanFileSize(f.size),
        mimeType: f.type || undefined,
        width,
        height,
        status: 'queued',
        base64,
      });
      runningBytes += f.size;
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
      pendingAutoAnalyze.current = true;
    }

    if (rejected.length > 0) {
      addActivity(
        'error',
        rejected.slice(0, 3).join(' ')
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addActivity, files, locale]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) await processFiles(selectedFiles);
  }, [processFiles]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide drag state if leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) await processFiles(droppedFiles);
  }, [processFiles]);

  // Send message
  const sendMessage = useCallback(async (customMsg?: string, silent?: boolean) => {
    const text = customMsg || userInput.trim();
    if (!text || isProcessing) return;
    setIsProcessing(true);
    setUserInput('');

    // Only upload files that haven't been sent before
    const newFiles = files.filter((f) => f.status === 'queued' && !sentFileIds.current.has(f.id));
    let fullMessage = text;
    const filesToUpload: Array<{
      name: string;
      base64: string;
      byteSize: number;
      mimeType?: string;
      kind: FileItem['type'];
      width?: number;
      height?: number;
    }> = [];

    if (newFiles.length > 0) {
      const desc = newFiles.map((f) => `- ${f.name} (${f.type}, ${f.size})`).join('\n');
      fullMessage = `${text}\n\n上传的文件：\n${desc}`;
      for (const f of newFiles) {
        if (f.base64) {
          filesToUpload.push({
            name: f.name,
            base64: f.base64,
            byteSize: f.byteSize,
            mimeType: f.mimeType,
            kind: f.type,
            width: f.width,
            height: f.height,
          });
        }
        sentFileIds.current.add(f.id);
      }
      // Mark files as done
      setFiles((prev) => prev.map((f) => sentFileIds.current.has(f.id) ? { ...f, status: 'done' } : f));
    }

    const langHint = locale === 'zh'
      ? '\n\n[语言要求：所有输出内容（包括生成的文件、报告标题、表头等）必须使用中文]'
      : '\n\n[Language: All output (including generated files, report titles, headers) must be in English]';
    fullMessage += langHint;

    if (silent) {
      const fileCount = newFiles.length || files.length;
      const msg = locale === 'zh' ? `📎 已接收 ${fileCount} 份文件，正在分析...` : `📎 Received ${fileCount} file(s), analyzing...`;
      addActivity('system', msg);
    } else {
      addActivity('user', text);
    }

    // Create a thinking group for this processing run
    const thinkingGroupId = `thinking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setActivities((prev) => [...prev, {
      id: thinkingGroupId,
      timestamp: Date.now(),
      type: 'thinking_group' as const,
      content: '',
      meta: { steps: [] as ThinkingStep[], collapsed: false, isLive: true },
    }]);

    // Deferred suggestions
    let pendingSuggestions: Array<{ id: string; emoji: string; title: string; description: string }> | null = null;
    let hadErrors = false;
    let gotFile = false;

    // Helper: push a step into the thinking group
    const pushThinkingStep = (step: ThinkingStep) => {
      setActivities((prev) => prev.map((a) =>
        a.id === thinkingGroupId
          ? { ...a, meta: { ...a.meta, steps: [...(a.meta?.steps || []), step] } }
          : a
      ));
    };

    // Helper: close (collapse) the thinking group
    const closeThinkingGroup = () => {
      setActivities((prev) => prev.map((a) =>
        a.id === thinkingGroupId
          ? { ...a, meta: { ...a.meta, collapsed: true, isLive: false } }
          : a
      ));
    };

    try {
      const requestAbortController = new AbortController();
      activeRequestAbortRef.current = requestAbortController;
      const resp = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'makers-conversation-id': conversationId,
        },
        signal: requestAbortController.signal,
        body: JSON.stringify({ message: fullMessage, files: filesToUpload.length > 0 ? filesToUpload : undefined }),
      });

      if (!resp.ok) {
        let errMsg = `HTTP ${resp.status}`;
        try {
          const errBody = await resp.text();
          if (resp.status === 429 || errBody.includes("quota")) {
            errMsg = t.quotaExhausted;
          } else if (errBody) {
            errMsg = errBody.slice(0, 200);
          }
        } catch {}
        throw new Error(errMsg);
      }
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let currentTextId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const event = JSON.parse(payload);

            if (event.type === 'text_delta' && event.delta) {
              currentText += event.delta;
              const snapshot = currentText;
              if (!currentTextId) {
                currentTextId = `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const newId = currentTextId;
                setActivities((prev) => {
                  if (prev.some((a) => a.id === newId)) return prev.map((a) => a.id === newId ? { ...a, content: snapshot } : a);
                  return [...prev, { id: newId, timestamp: Date.now(), type: 'text' as const, content: snapshot }];
                });
              } else {
                const updateId = currentTextId;
                setActivities((prev) => prev.map((a) => a.id === updateId ? { ...a, content: snapshot } : a));
              }
            } else if (event.type === 'tool_called' && event.tool) {
              currentText = '';
              currentTextId = '';
              if (event.tool !== 'suggest_actions') {
                const agentAction = toolToAgentAction(event.tool, event.input, locale);
                pushThinkingStep({ type: 'tool_call', content: agentAction });
              }
            } else if (event.type === 'suggest_actions' && event.actions) {
              pendingSuggestions = event.actions;
            } else if (event.type === 'code_output') {
              // Intentionally suppressed — AI text response already summarises results
            } else if (event.type === 'code_error') {
              if (event.stderr?.trim()) {
                hadErrors = true;
                // Show only the first meaningful error line, not full Python traceback
                const lines = event.stderr.trim().split('\n');
                const errorLine = lines.find((l: string) =>
                  /^(Error|Exception|ValueError|TypeError|ImportError|SyntaxError|AttributeError|NameError|KeyError|IndexError|OSError|IOError|RuntimeError|ModuleNotFoundError|FileNotFoundError|PermissionError|ZeroDivisionError)/
                    .test(l)
                ) || lines[lines.length - 1] || lines[0];
                pushThinkingStep({ type: 'error', content: errorLine.slice(0, 300) });
              }
            } else if (event.type === 'file_output' && event.filename) {
              gotFile = true;
              addActivity('file_download', event.filename, { base64: event.base64, description: event.description });
            } else if (event.type === 'usage') {
              setTokenUsage((prev) => ({ input: prev.input + (event.input_tokens || 0), output: prev.output + (event.output_tokens || 0) }));
            }
          } catch { /* skip */ }
        }
      }

      // Collapse the thinking group now that processing is done
      closeThinkingGroup();

      // Render suggestions, retry card, or task complete
      if (pendingSuggestions) {
        addActivity('suggestions', '', { actions: pendingSuggestions });
      } else if (hadErrors && !gotFile) {
        // Errors occurred but no file was produced — show retry card
        addActivity('retry_card',
          locale === 'zh' ? '处理过程中遇到了问题，请重试' : 'Something went wrong during processing, please retry',
          { message: text }
        );
      } else {
        setActivities((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type === 'text' && last.content) {
            const cleaned = last.content.replace(/\n*(?:以下是|请选择|请点击|点击上方|您可以选择|推荐的处理方案|以下是为您推荐)[\s\S]*$/, '').trim();
            if (cleaned !== last.content && cleaned) {
              return prev.map((a) => a.id === last.id ? { ...a, content: cleaned } : a);
            }
          }
          return prev;
        });
        addActivity('system', t.taskComplete);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
      closeThinkingGroup();
      addActivity('error', `${(err as Error).message}`);
    } finally {
      activeRequestAbortRef.current = null;
      setIsProcessing(false);
    }
  }, [userInput, files, isProcessing, conversationId, addActivity, locale]);

  // Auto-trigger analysis only for NEW files
  useEffect(() => {
    if (pendingAutoAnalyze.current && files.length > 0 && !isProcessing) {
      // Check if there are actually new (unsent) files
      const hasNewFiles = files.some((f) => f.status === 'queued' && !sentFileIds.current.has(f.id));
      if (hasNewFiles) {
        pendingAutoAnalyze.current = false;
        sendMessage(t.suggestPrompt, true);
      } else {
        pendingAutoAnalyze.current = false;
      }
    }
  }, [files, isProcessing, sendMessage, t.suggestPrompt]);

  const isDark = theme === 'dark';
  const hasConversation = activities.length > 0;

  // Queued (unsent) files — shown as chips in the input area
  const queuedFiles = files.filter((f) => !sentFileIds.current.has(f.id));
  const queuedBytes = queuedFiles.reduce((sum, f) => sum + f.byteSize, 0);
  const uploadRulesText = locale === 'zh'
    ? `建议：单文件不超过 ${humanFileSize(MAX_SINGLE_FILE_BYTES)}，单次总计不超过 ${humanFileSize(MAX_TOTAL_UPLOAD_BYTES)}，图片边长不超过 ${MAX_IMAGE_DIMENSION}px。`
    : `Recommended: keep each file under ${humanFileSize(MAX_SINGLE_FILE_BYTES)}, total uploads under ${humanFileSize(MAX_TOTAL_UPLOAD_BYTES)}, and images within ${MAX_IMAGE_DIMENSION}px per side.`;

  return (
    <div
      className="h-screen flex flex-col app-backdrop text-[var(--foreground)]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={dropZoneRef}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none border-2 border-dashed rounded-2xl m-3 bg-[var(--accent-subtle)]/80 border-[var(--accent)]/40 backdrop-blur-md">
          <div className="text-center">
            <div className="text-4xl mb-2">📂</div>
            <p className="text-sm font-semibold text-blue-500">
              {locale === 'zh' ? '释放以上传文件' : 'Drop files to upload'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] px-4 sm:px-6 py-2.5 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={resetToHome}
          aria-label={locale === 'zh' ? '回到初始页并开始新会话' : 'Return home and start a new session'}
          title={locale === 'zh' ? '回到初始页' : 'Return home'}
          className="flex items-center gap-3 rounded-xl -ml-1 px-1 py-1 text-left transition-colors hover:bg-[var(--bg-inset)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#E50914] to-[#9C070F] flex-shrink-0 shadow-[0_2px_8px_rgba(229,9,20,0.3)]">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-d-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ccd5e0" />
                </linearGradient>
                <linearGradient id="logo-d-loop" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#ebf1f8" />
                  <stop offset="100%" stopColor="#99a7be" />
                </linearGradient>
                <filter id="logo-d-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.5" />
                </filter>
              </defs>
              <path d="M12.5 16 C 12.5 19.5, 15.5 22, 19.5 22 C 24 22, 26 19.5, 26 16 C 26 12.5, 24 10, 19.5 10 L 12.5 10 L 12.5 4 C 21 4, 27 9, 27 16 C 27 23, 21 28, 12.5 28 L 8 28 L 8 22.5 L 12.5 22.5" fill="url(#logo-d-loop)" />
              <path d="M7 4 H 12.5 V 28 H 7 Z" fill="url(#logo-d-bar)" filter="url(#logo-d-shadow)" />
              <path d="M12.5 4 C 18 4, 23.5 7, 25.5 11 L 20.5 13.5 C 19 11.5, 16 9.5, 12.5 9.5 Z" fill="url(#logo-d-loop)" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="flex items-baseline">
                <span className="text-lg font-black tracking-tight text-[var(--brand)] font-sans">DOC</span>
                <span className="text-lg font-black tracking-tight text-[var(--text-primary)] font-sans ml-0.5">FLIX</span>
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/15 uppercase tracking-wider">
                {locale === 'zh' ? 'AI' : 'AI'}
              </span>
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`} />
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {tokenUsage.input > 0 && (
            <span className="hidden sm:inline-block text-[11px] px-2.5 py-1 rounded-full font-mono bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
              {(tokenUsage.input + tokenUsage.output).toLocaleString()} tk
            </span>
          )}
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className={`lg:hidden min-h-9 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all nm-button ${workspaceOpen ? 'active text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            {files.length > 0 ? `${files.length}` : locale === 'zh' ? '文件' : 'Files'}
          </button>
          <button onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className="min-h-9 w-9 flex items-center justify-center rounded-lg transition-all nm-button text-[var(--text-secondary)] text-xs font-bold">
            {locale === 'zh' ? 'EN' : '中'}
          </button>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="min-h-9 w-9 flex items-center justify-center rounded-lg transition-all nm-button text-[var(--text-secondary)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isDark
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              }
            </svg>
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 flex overflow-hidden p-3 sm:p-4 bg-transparent">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 max-w-[1600px] w-full mx-auto h-full overflow-hidden relative">

          {/* Left Column: File Workspace */}
          <div className={`${
            workspaceOpen
              ? 'absolute inset-0 z-20 flex bg-[var(--bg-base)]'
              : 'hidden lg:flex'
          } lg:col-span-4 xl:col-span-3 flex-col nm-flat rounded-2xl overflow-hidden h-full`}>

            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-subtle)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {locale === 'zh' ? '文件空间' : 'Workspace'}
                </h2>
                {files.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)]">{files.length}</span>
                )}
              </div>
              {files.length > 0 && (
                <button
                  onClick={() => { setFiles([]); sentFileIds.current.clear(); }}
                  className="text-[11px] text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded-md transition-colors hover:bg-red-500/8 dark:hover:bg-red-500/15"
                >
                  {locale === 'zh' ? '清空' : 'Clear'}
                </button>
              )}
            </div>

            {/* Upload Zone */}
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group rounded-xl p-5 border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent)]/40 dark:hover:border-[var(--accent)]/30 cursor-pointer flex flex-col items-center gap-2.5 text-center transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent-subtle)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] block group-hover:text-[var(--accent)] transition-colors">
                    {locale === 'zh' ? '上传文件' : 'Upload Files'}
                  </span>
                  <span className="text-[12px] text-[var(--text-tertiary)] block mt-0.5 leading-snug">
                    {locale === 'zh' ? '拖拽或点击上传 · PDF、Word、Excel、CSV、图片、文本' : 'Drag or click to upload · PDF, Word, Excel, CSV, images, text'}
                  </span>
                </div>
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <span className="text-3xl mb-3 opacity-30">📂</span>
                  <p className="text-base font-medium text-[var(--text-primary)]">
                    {locale === 'zh' ? '还没有文件' : 'No files yet'}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-tertiary)] max-w-[220px]">
                    {locale === 'zh'
                      ? '先上传文件，或直接在右侧输入你想做的事情。'
                      : 'Upload a file first, or type what you want to do on the right.'}
                  </p>
                </div>
              ) : (
                files.map((file) => {
                  const isQueued = !sentFileIds.current.has(file.id);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/25 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base flex-shrink-0">{getFileIcon(file.type)}</span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate text-[var(--text-primary)]">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            {file.size}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {file.status === 'processing' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        ) : isQueued ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                            {locale === 'zh' ? '待发送' : 'Queued'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                            {locale === 'zh' ? '已就绪' : 'Ready'}
                          </span>
                        )}

                        <button
                          onClick={() => { setFiles((prev) => prev.filter((f) => f.id !== file.id)); sentFileIds.current.delete(file.id); }}
                          className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            {files.length > 0 && (
              <div className="px-4 py-3.5 border-t border-[var(--border-subtle)] space-y-2 flex-shrink-0">
                <button
                  onClick={() => sendMessage(t.suggestPrompt, true)}
                  disabled={isProcessing || !files.some(f => !sentFileIds.current.has(f.id))}
                  className="w-full py-2.5 text-xs font-bold rounded-xl nm-button-primary disabled:opacity-50 disabled:pointer-events-none"
                >
                  {locale === 'zh' ? '开始分析' : 'Analyze Files'}
                </button>
              </div>
            )}

            {/* Close Mobile Workspace */}
            {workspaceOpen && (
              <button
                onClick={() => setWorkspaceOpen(false)}
                className="mx-4 mb-4 py-2.5 text-xs font-semibold rounded-lg nm-button text-[var(--text-secondary)] lg:hidden flex-shrink-0"
              >
                {locale === 'zh' ? '返回对话' : 'Back to Chat'}
              </button>
            )}
          </div>

          {/* Right Column: Chat Window */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col nm-flat rounded-2xl overflow-hidden h-full">

            {/* Activities Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col justify-between">

              <div className="space-y-3.5 w-full">
                {!hasConversation ? (
                  /* ─── Welcome Screen ─── */
                  <div className="py-10 px-4 flex flex-col items-center justify-center text-center h-full max-w-2xl mx-auto">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--accent-subtle)] to-transparent border border-[var(--accent)]/15 mb-5 ${isDark ? 'animate-breathe' : ''}`}>
                      <svg className="w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>

                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    {locale === 'zh' ? '上传文件，开始处理' : 'Upload files to get started'}
                  </h2>
                    <p className="text-base text-[var(--text-secondary)] mb-5 leading-relaxed max-w-lg">
                      {locale === 'zh'
                        ? '支持 PDF、Word、Excel、CSV、图片和文本。上传后可以直接让 AI 做摘要、转换、合并或整理。'
                        : 'Supports PDF, Word, Excel, CSV, images, and text. Upload a file and ask for summaries, conversions, merges, or cleanup.'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mb-7 leading-relaxed max-w-md">
                      {uploadRulesText}
                    </p>

                    {/* Quick Command Cards */}
                    <div className="w-full space-y-3 text-left">
                      <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest pl-1">
                        {locale === 'zh' ? '快速指令' : 'Quick Actions'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {[
                          {
                            title: locale === 'zh' ? '分析并推荐' : 'Analyze & recommend',
                            desc: locale === 'zh' ? '先检查文件，再给出处理建议' : 'Inspect the files first, then suggest next steps',
                            cmd: locale === 'zh' ? '我上传了这些文件，请分析它们的基本信息并给我推荐几个处理方案' : 'I uploaded these files, please analyze them and recommend processing plans.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          },
                          {
                            title: locale === 'zh' ? '生成摘要' : 'Summarize',
                            desc: locale === 'zh' ? '提炼内容重点' : 'Extract the main points',
                            cmd: locale === 'zh' ? '请阅读我加载的文件，并为我写一份简洁的核心内容摘要' : 'Please read the loaded files and write a concise executive summary.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          },
                          {
                            title: locale === 'zh' ? '表格转 Markdown' : 'Table to Markdown',
                            desc: locale === 'zh' ? '把表格整理成可读格式' : 'Turn spreadsheets into readable tables',
                            cmd: locale === 'zh' ? '请把数据表格转换为 Markdown 格式展示' : 'Please convert the loaded spreadsheet into Markdown format.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          },
                          {
                            title: locale === 'zh' ? '合并 PDF' : 'Merge PDFs',
                            desc: locale === 'zh' ? '合并多份 PDF' : 'Merge multiple PDF files',
                            cmd: locale === 'zh' ? '帮我把工作区里的 PDF 文件合并成一份，并确保格式完好' : 'Help me merge the PDF files in the workspace into one.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(item.cmd)}
                            disabled={isProcessing}
                            className="p-3.5 text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-subtle)] transition-all group flex items-start gap-3 disabled:opacity-50"
                          >
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-subtle)] text-[var(--accent)] flex-shrink-0 group-hover:bg-[var(--accent)] group-hover:text-white transition-all">
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{item.title}</p>
                              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  activities.map((entry) => {
                    /* ── Thinking group ── */
                    if (entry.type === 'thinking_group') {
                      const steps: ThinkingStep[] = entry.meta?.steps || [];
                      if (steps.length === 0) return null;
                      return (
                        <div key={entry.id} className="flex items-start gap-2.5 min-w-0 w-full">
                          <span className="text-[10px] font-mono mt-2.5 w-12 flex-shrink-0 text-[var(--text-tertiary)]">{timeStr(entry.timestamp)}</span>
                          <div className="flex-1 min-w-0">
                            <ThinkingPanel steps={steps} collapsed={entry.meta?.collapsed ?? false} isLive={entry.meta?.isLive ?? false}
                              onToggle={() => { setActivities((prev) => prev.map((a) => a.id === entry.id ? { ...a, meta: { ...a.meta, collapsed: !a.meta?.collapsed } } : a)); }}
                              isDark={isDark} locale={locale} />
                          </div>
                        </div>
                      );
                    }

                    /* ── Retry card ── */
                    if (entry.type === 'retry_card') {
                      return (
                        <div key={entry.id} className="flex items-start gap-2.5 min-w-0 w-full">
                          <span className="text-[10px] font-mono mt-1 w-12 flex-shrink-0 text-[var(--text-tertiary)]">{timeStr(entry.timestamp)}</span>
                          <div className="flex-1 rounded-xl border p-3.5 bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-800/20">
                            <p className="text-xs mb-2.5 text-red-600 dark:text-red-300">⚠️ {entry.content}</p>
                            <button onClick={() => sendMessage(entry.meta?.message)} disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg nm-button text-red-500">
                              {locale === 'zh' ? '重新操作' : 'Retry'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    /* ── Standard entries ── */
                    return (
                      <div key={entry.id} className="flex items-start gap-2.5 min-w-0 w-full">
                        <span className="text-[10px] font-mono mt-1 w-12 flex-shrink-0 text-[var(--text-tertiary)]">{timeStr(entry.timestamp)}</span>

                        {entry.type === 'user' && (
                          <>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-[var(--accent-subtle)] text-[var(--accent)]">YOU</span>
                            <p className="text-[14px] leading-relaxed text-[var(--text-primary)]">{entry.content}</p>
                          </>
                        )}

                        {entry.type === 'system' && (
                          <p className="text-sm italic text-[var(--text-secondary)]">{entry.content}</p>
                        )}

                        {entry.type === 'tool_call' && (
                          <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${isDark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                              {locale === 'zh' ? '操作' : 'ACT'}
                            </span>
                            <span className="text-xs text-amber-700 dark:text-amber-200/80">{entry.content}</span>
                          </>
                        )}

                        {entry.type === 'suggestions' && entry.meta?.actions && (
                          <div className="flex-1 min-w-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                              {(entry.meta.actions as Array<{ id: string; emoji: string; title: string; description: string }>).map((action) => (
                                <button key={action.id} onClick={() => sendMessage(action.title)} disabled={isProcessing}
                                  className="text-left px-3.5 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent-subtle)] transition-all disabled:opacity-50">
                                  <div className="flex items-start gap-2.5">
                                    <span className="text-base flex-shrink-0 mt-0.5">{action.emoji}</span>
                                    <div className="min-w-0">
                                      <p className="text-[12px] font-bold text-[var(--text-primary)]">{action.title}</p>
                                      <p className="text-[10px] mt-0.5 leading-relaxed text-[var(--text-tertiary)]">{action.description}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.type === 'text' && (
                          <>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-gradient-to-r from-[var(--accent-subtle)] to-transparent text-[var(--accent)]">AI</span>
                            <div className="flex-1 min-w-0 overflow-x-auto">
                              <StreamingText content={entry.content} isStreaming={isProcessing && entry.id === activities[activities.length - 1]?.id} />
                            </div>
                          </>
                        )}

                        {entry.type === 'file_download' && (
                          <>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>FILE</span>
                            <span className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {locale === 'zh' ? '文件可下载' : 'File ready'} ↓
                            </span>
                          </>
                        )}

                        {entry.type === 'error' && (
                          <>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">ERR</span>
                            <pre className={`text-xs overflow-x-auto max-h-20 overflow-y-auto flex-1 p-2.5 rounded-lg border border-[var(--border-subtle)] ${isDark ? 'text-red-300 bg-red-950/10' : 'text-red-600 bg-red-50'}`}>
                              {entry.content.slice(0, 500)}
                            </pre>
                          </>
                        )}
                      </div>
                    );
                  })
                )}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-sm py-1 pl-14 text-[var(--accent)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    {locale === 'zh' ? '正在处理文件...' : 'Processing files...'}
                  </div>
                )}

                {/* Downloads list */}
                {!isProcessing && activities.filter((a) => a.type === 'file_download').length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-subtle)] w-full">
                    <p className="text-xs font-bold mb-2.5 text-emerald-600 dark:text-emerald-400">
                      {locale === 'zh' ? '已生成文件' : 'Generated Files'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activities.filter((a) => a.type === 'file_download').map((entry) => (
                        <a key={entry.id}
                          href={`data:application/octet-stream;base64,${entry.meta?.base64 || ''}`}
                          download={entry.content}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors">
                          <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">{entry.content}</span>
                            {entry.meta?.description && (
                              <span className="text-xs text-[var(--text-tertiary)] block truncate mt-0.5">{entry.meta.description}</span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={activityEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="px-5 pb-4 pt-2 border-t border-[var(--border-subtle)] flex-shrink-0">

              {/* Queued file chips */}
              {queuedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 px-0.5">
                  {queuedFiles.map((f) => (
                    <span key={f.id}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--accent-subtle)] text-[var(--accent)]">
                      <span>{getFileIcon(f.type)}</span>
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-[var(--accent)]/20 transition-colors">×</button>
                    </span>
                  ))}
                  {queuedFiles.length > 1 && (
                    <button onClick={() => setFiles((prev) => prev.filter((f) => sentFileIds.current.has(f.id)))}
                      className="text-[11px] text-[var(--text-tertiary)] hover:text-red-500 hover:underline px-1.5 py-0.5 transition-colors">
                      {locale === 'zh' ? '清空' : 'Clear all'}
                    </button>
                  )}
                </div>
              )}
              <p className="mb-2 text-xs text-[var(--text-tertiary)] px-0.5">
                {uploadRulesText}
                {queuedFiles.length > 0 && (
                  <span className="ml-2">
                    {locale === 'zh'
                      ? `当前待处理 ${queuedFiles.length} 个文件，共 ${humanFileSize(queuedBytes)}。`
                      : `${queuedFiles.length} queued file(s), ${humanFileSize(queuedBytes)} total.`}
                  </span>
                )}
              </p>

              {/* Input bar */}
              <div className="flex items-end gap-2 rounded-xl p-1.5 nm-pressed glow-accent border border-[var(--border-subtle)]">
                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all nm-button text-[var(--text-tertiary)] hover:text-[var(--accent)]">
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <input type="text" value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={() => { isComposingRef.current = false; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) { e.preventDefault(); sendMessage(); } }}
                  placeholder={locale === 'zh' ? '输入指令...' : 'Type a command...'}
                  disabled={isProcessing}
                  className="flex-1 bg-transparent text-[15px] focus:outline-none disabled:opacity-50 py-2 px-1.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]" />

                <button onClick={() => sendMessage()}
                  disabled={(!userInput.trim() && queuedFiles.length === 0) || isProcessing}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg nm-button-primary disabled:opacity-40 disabled:pointer-events-none">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept={getUploadAcceptString()}
      />
    </div>
  );
}
