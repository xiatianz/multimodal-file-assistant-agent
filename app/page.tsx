'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { useI18n } from '@/lib/i18n';

// Configure marked for GFM tables
marked.setOptions({ gfm: true, breaks: true });

// ============ Types ============

export interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'word' | 'excel' | 'csv' | 'text';
  size: string;
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

function getFileType(name: string): FileItem['type'] {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['csv'].includes(ext)) return 'csv';
  return 'text';
}

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

const SAMPLE_FILES: Omit<FileItem, 'base64'>[] = [
  { id: 's1', name: 'quarterly-report.txt', type: 'text', size: '2.1 KB', status: 'queued' },
  { id: 's2', name: 'project-plan.md', type: 'text', size: '1.5 KB', status: 'queued' },
  { id: 's3', name: 'sales-data.csv', type: 'csv', size: '380 B', status: 'queued' },
  { id: 's4', name: 'team-contacts.csv', type: 'csv', size: '260 B', status: 'queued' },
];

function generateSampleContent(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  let text = '';
  if (ext === 'txt') {
    text = 'Quarterly Financial Report 2024 Q4\n====================================\n\nRevenue: $2.4B (+15% YoY)\nNet Profit: $340M (+22% YoY)\nOperating Margin: 28%\n\nKey Highlights:\n- Expanded into 3 new markets\n- Customer base grew 22%\n- Reduced operational costs by 18%\n- Launched AI-powered product suite\n\nRevenue Breakdown:\n- Enterprise: $1.2B (50%)\n- SMB: $720M (30%)\n- Consumer: $480M (20%)';
  } else if (ext === 'md') {
    text = '# Project Plan: AI Integration 2025\n\n## Phase 1: Research (Jan-Mar)\n- Evaluate LLM providers\n- Build POC\n\n## Phase 2: Development (Apr-Jun)\n- API architecture\n- RAG pipeline\n- Testing framework\n\n## Phase 3: Launch (Jul-Sep)\n- Beta testing\n- Customer pilot\n- Production deployment\n\n## Team\n| Role | Name | Allocation |\n|------|------|---|\n| Tech Lead | Alice | 100% |\n| Backend | Bob | 100% |\n| ML | Eric | 100% |\n| PM | Fiona | 50% |';
  } else if (ext === 'csv' && name.includes('sales')) {
    text = 'Product,Q1_Revenue,Q2_Revenue,Q3_Revenue,Q4_Revenue,Unit_Price,Units_Sold\nWidget Pro,45000,52000,61000,72000,299,241\nWidget Lite,28000,31000,35000,42000,149,282\nWidget Enterprise,120000,135000,155000,180000,999,180\nCloud Suite,85000,95000,110000,128000,599,214\nData Toolkit,32000,38000,44000,51000,199,256\nAI Assistant,15000,42000,68000,95000,399,238\nMobile App,22000,25000,29000,34000,99,343\nAPI Gateway,55000,62000,71000,82000,499,164';
  } else if (ext === 'csv') {
    text = 'Name,Email,Department,Role,Location,Start_Date\nAlice Chen,alice@company.com,Engineering,Tech Lead,Beijing,2020-03-15\nBob Wang,bob@company.com,Engineering,Senior Engineer,Shanghai,2021-06-01\nCharlie Liu,charlie@company.com,Engineering,Engineer,Shenzhen,2022-01-10\nDiana Zhang,diana@company.com,Product,Product Manager,Beijing,2021-09-20\nEric Li,eric@company.com,Engineering,ML Engineer,Hangzhou,2023-02-28\nFiona Wu,fiona@company.com,Product,Senior PM,Beijing,2019-11-05\nGrace Huang,grace@company.com,Design,UI Designer,Shanghai,2022-07-15';
  } else {
    text = `Sample content for ${name}`;
  }
  return btoa(unescape(encodeURIComponent(text)));
}

// ============ Main Component ============

export default function Home() {
  const { t, locale, setLocale } = useI18n();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [conversationId] = useState(() => crypto.randomUUID());
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const activityEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const pendingAutoAnalyze = useRef(false);
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

  // File handling
  const processFiles = useCallback(async (selectedFiles: File[]) => {
    const items: FileItem[] = await Promise.all(
      selectedFiles.map(async (f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        type: getFileType(f.name),
        size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
        status: 'queued' as const,
        base64: await readFileAsBase64(f),
      }))
    );
    setFiles((prev) => [...prev, ...items]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    pendingAutoAnalyze.current = true;
  }, []);

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

  const loadSamples = useCallback(() => {
    const items: FileItem[] = SAMPLE_FILES.map((f) => ({
      ...f, id: crypto.randomUUID(), base64: generateSampleContent(f.name),
    }));
    setFiles(items);
    pendingAutoAnalyze.current = true;
  }, []);

  // Send message
  const sendMessage = useCallback(async (customMsg?: string, silent?: boolean) => {
    const text = customMsg || userInput.trim();
    if (!text || isProcessing) return;
    setIsProcessing(true);
    setUserInput('');

    // Only upload files that haven't been sent before
    const newFiles = files.filter((f) => f.status === 'queued' && !sentFileIds.current.has(f.id));
    let fullMessage = text;
    const filesToUpload: Array<{ name: string; base64: string }> = [];

    if (newFiles.length > 0) {
      const desc = newFiles.map((f) => `- ${f.name} (${f.type}, ${f.size})`).join('\n');
      fullMessage = `${text}\n\n上传的文件：\n${desc}`;
      for (const f of newFiles) {
        if (f.base64) filesToUpload.push({ name: f.name, base64: f.base64 });
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
      const resp = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'makers-conversation-id': conversationId,
        },
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
      closeThinkingGroup();
      addActivity('error', `${(err as Error).message}`);
    } finally {
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#E50914] to-[#9C070F] flex-shrink-0 shadow-[0_2px_8px_rgba(229,9,20,0.3)]">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-d-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#dce3ee" />
                </linearGradient>
                <linearGradient id="logo-d-loop" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#a4b8d4" />
                </linearGradient>
                <linearGradient id="logo-d-inner" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4d4d" />
                  <stop offset="100%" stopColor="#990000" />
                </linearGradient>
                <filter id="logo-d-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="-1" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.45" />
                </filter>
              </defs>
              <path d="M7 4 H12.5 V28 H7 Z" fill="url(#logo-d-bar)" />
              <path d="M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z" fill="url(#logo-d-inner)" />
              <path d="M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z" fill="url(#logo-d-loop)" filter="url(#logo-d-shadow)" />
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
        </div>
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
                  <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">
                    {locale === 'zh' ? '拖拽或点击 · PDF/Word/Excel/图片/音视频' : 'Drag & drop · PDF, Word, Excel, Images, Media'}
                  </span>
                </div>
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <span className="text-3xl mb-3 opacity-30">📂</span>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {locale === 'zh' ? '暂无文件' : 'No files yet'}
                  </p>
                  <button
                    onClick={loadSamples}
                    disabled={isProcessing}
                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg nm-button text-[var(--accent)] disabled:opacity-50"
                  >
                    {locale === 'zh' ? '加载示例' : 'Load Samples'}
                  </button>
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
                {files.every(f => sentFileIds.current.has(f.id)) && (
                  <button
                    onClick={loadSamples}
                    disabled={isProcessing}
                    className="w-full py-2 text-xs font-semibold rounded-lg nm-button text-[var(--text-secondary)] disabled:opacity-50"
                  >
                    {locale === 'zh' ? '+ 导入示例文件' : '+ Load Samples'}
                  </button>
                )}
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
                      {locale === 'zh' ? 'DocFlix 智能文档助理' : 'DocFlix Doc Assistant'}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed max-w-md">
                      {locale === 'zh'
                        ? '上传文档、表格或图片，输入指令即可让 AI 帮你分析、转换、合并。'
                        : 'Upload docs, spreadsheets or images, then tell the AI what to do.'}
                    </p>

                    {/* Quick Command Cards */}
                    <div className="w-full space-y-3 text-left">
                      <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest pl-1">
                        {locale === 'zh' ? '快速指令' : 'Quick Actions'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {[
                          {
                            title: locale === 'zh' ? '推荐处理方案' : 'Suggest plans',
                            desc: locale === 'zh' ? '检查文件并推荐最佳处理方案' : 'Check files and suggest actions',
                            cmd: locale === 'zh' ? '我上传了这些文件，请分析它们的基本信息并给我推荐几个处理方案' : 'I uploaded these files, please analyze them and recommend processing plans.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          },
                          {
                            title: locale === 'zh' ? '核心摘要' : 'Summary',
                            desc: locale === 'zh' ? '阅读文件并提取核心要点' : 'Read files and extract key points',
                            cmd: locale === 'zh' ? '请阅读我加载的文件，并为我写一份简洁的核心内容摘要' : 'Please read the loaded files and write a concise executive summary.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          },
                          {
                            title: locale === 'zh' ? '表格转换' : 'Convert data',
                            desc: locale === 'zh' ? '将数据转换为 Markdown 表格' : 'Convert data to markdown table',
                            cmd: locale === 'zh' ? '请把数据表格转换为 Markdown 格式展示' : 'Please convert the loaded spreadsheet into Markdown format.',
                            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          },
                          {
                            title: locale === 'zh' ? '合并 PDF' : 'Merge PDFs',
                            desc: locale === 'zh' ? '一键合并多份 PDF 文档' : 'Merge multiple PDFs into one',
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
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-gradient-to-r from-[var(--accent-subtle)] to-transparent text-[var(--accent)]">AI</span>
                            <div className="flex-1 min-w-0 overflow-x-auto">
                              <StreamingText content={entry.content} isStreaming={isProcessing && entry.id === activities[activities.length - 1]?.id} />
                            </div>
                          </>
                        )}

                        {entry.type === 'file_download' && (
                          <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>FILE</span>
                            <span className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {locale === 'zh' ? '文件可下载' : 'File ready'} ↓
                            </span>
                          </>
                        )}

                        {entry.type === 'error' && (
                          <>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">ERR</span>
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
                  <div className="flex items-center gap-2 text-xs py-1 pl-14 text-[var(--accent)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    {locale === 'zh' ? '处理中...' : 'Processing...'}
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
                            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate block">{entry.content}</span>
                            {entry.meta?.description && (
                              <span className="text-[11px] text-[var(--text-tertiary)] block truncate mt-0.5">{entry.meta.description}</span>
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
                      className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--accent-subtle)] text-[var(--accent)]">
                      <span>{getFileIcon(f.type)}</span>
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-[var(--accent)]/20 transition-colors">×</button>
                    </span>
                  ))}
                  {queuedFiles.length > 1 && (
                    <button onClick={() => setFiles((prev) => prev.filter((f) => sentFileIds.current.has(f.id)))}
                      className="text-[10px] text-[var(--text-tertiary)] hover:text-red-500 hover:underline px-1.5 py-0.5 transition-colors">
                      {locale === 'zh' ? '清空' : 'Clear all'}
                    </button>
                  )}
                </div>
              )}

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
                  className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50 py-2 px-1.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]" />

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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.json,.xml,.html"
      />
    </div>
  );
}
