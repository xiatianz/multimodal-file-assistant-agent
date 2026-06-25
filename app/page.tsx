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
    <div className="rounded-xl border border-gray-200 dark:border-gray-750/50 bg-gray-50/90 dark:bg-gray-900/50 overflow-hidden text-xs">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800/40"
      >
        {isLive ? (
          <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
        ) : (
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'} text-gray-400 dark:text-gray-400`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        <span className="font-medium text-gray-500 dark:text-gray-300">
          {isLive
            ? (isZh ? '处理中...' : 'Processing...')
            : stepCount > 0
              ? (isZh ? `思考过程 · ${stepCount} 步操作` : `Thinking · ${stepCount} steps`)
              : (isZh ? '思考过程' : 'Thinking')}
        </span>
        {!isLive && stepCount > 0 && (
          <span className="ml-auto text-gray-400 dark:text-gray-600">
            {collapsed ? '▼' : '▲'}
          </span>
        )}
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t border-gray-100 dark:border-gray-700/40">
          <div className="px-3 py-2.5 space-y-1.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[10px] font-medium mt-0.5 ${
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
              <div className="flex items-center gap-1.5 pt-0.5 text-gray-400 dark:text-gray-600">
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                <span>{isZh ? '等待下一步操作...' : 'Waiting for next action...'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none border-2 border-dashed rounded-lg m-3 bg-blue-50/90 dark:bg-slate-900/90 border-blue-400 dark:border-blue-500/50">
          <div className="text-center">
            <div className="text-4xl mb-2">📂</div>
            <p className="text-sm font-semibold text-blue-500">
              {locale === 'zh' ? '释放以上传文件' : 'Drop files to upload'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--card-bg)]/88 backdrop-blur-xl border-b border-[var(--border-color)] px-4 sm:px-6 py-3.5 flex items-center justify-between z-10 shadow-[0_8px_26px_-24px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#090b11] border border-gray-800 flex-shrink-0 shadow-[0_10px_24px_-18px_rgba(229,9,20,0.8)]">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="netflix-red-1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#9C070F" />
                </linearGradient>
                <linearGradient id="netflix-red-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F51522" />
                  <stop offset="50%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#B81D24" />
                </linearGradient>
                <linearGradient id="netflix-red-3" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#7A050B" />
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="-1" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.6"/>
                </filter>
              </defs>
              <path d="M7 4H12V28H7V4Z" fill="url(#netflix-red-1)" />
              <path d="M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z" fill="url(#netflix-red-2)" filter="url(#shadow)" />
              <path d="M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z" fill="url(#netflix-red-3)" opacity="0.85" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="flex items-baseline">
              <span className="text-xl font-black tracking-normal text-[#E50914] font-sans">
                  DOC
                </span>
              <span className="text-xl font-black tracking-normal text-gray-800 dark:text-gray-100 font-sans ml-0.5">
                  FLIX
                </span>
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20">
                {locale === 'zh' ? '智能文档' : 'AI Doc'}
              </span>
              <div className={`w-2.5 h-2.5 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">

          {tokenUsage.input > 0 && (
            <span className="hidden sm:inline-block text-xs px-2.5 py-1.5 rounded-lg font-mono nm-pressed border border-[var(--border-color)] text-gray-600 dark:text-gray-300">
              {(tokenUsage.input + tokenUsage.output).toLocaleString()} tokens
            </span>
          )}
          {/* Toggle Workspace Button (Visible only on mobile/tablet) */}
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className={`lg:hidden min-h-11 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all border border-[var(--border-color)] nm-button ${workspaceOpen ? 'active text-blue-500' : 'text-gray-600 dark:text-gray-300'}`}
          >
            📂 {files.length > 0 ? `${files.length}` : '文件'}
          </button>
          <button onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className="min-h-11 px-3 py-2 text-sm font-semibold rounded-lg transition-all border border-[var(--border-color)] nm-button text-gray-600 dark:text-gray-300">
            {locale === 'zh' ? 'EN' : '中文'}
          </button>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="min-h-11 px-3 py-2 text-sm font-semibold rounded-lg transition-all border border-[var(--border-color)] nm-button text-gray-600 dark:text-gray-300">
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 flex overflow-hidden p-3 sm:p-5 bg-transparent">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 max-w-[1600px] w-full mx-auto h-full overflow-hidden relative">
          
          {/* Left Column: File Workspace */}
          <div className={`${
            workspaceOpen 
              ? 'absolute inset-0 z-20 flex bg-[var(--background)]' 
              : 'hidden lg:flex'
          } lg:col-span-4 xl:col-span-3 flex-col nm-flat rounded-xl p-4 border border-[var(--border-color)] overflow-hidden h-full`}>
            
            {/* Sidebar header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {locale === 'zh' ? '文件控制中心' : 'File Workspace'}
                </h2>
              </div>
              {files.length > 0 && (
                <button
                  onClick={() => {
                    setFiles([]);
                    sentFileIds.current.clear();
                  }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg transition-colors hover:bg-red-500/10"
                >
                  {locale === 'zh' ? '清空' : 'Clear'}
                </button>
              )}
            </div>

            {/* Compact Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group nm-pressed rounded-xl p-5 border border-dashed border-slate-300 dark:border-slate-700/70 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer flex flex-col items-center gap-2 text-center transition-all mb-4 active:scale-[0.99] flex-shrink-0"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center nm-flat border border-[var(--border-color)] text-gray-400 group-hover:text-blue-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block group-hover:text-blue-500 transition-colors">
                  {locale === 'zh' ? '上传文档/表格/图片' : 'Upload Files'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-300 block mt-0.5">
                  {locale === 'zh' ? '拖拽或点击浏览' : 'Drag & drop or click'}
                </span>
              </div>
            </div>

            {/* File list scrollarea */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <span className="text-3xl mb-2 opacity-40">📊</span>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {locale === 'zh' ? '工作区暂无文件' : 'No files in workspace'}
                  </p>
                  <button
                    onClick={loadSamples}
                    disabled={isProcessing}
                    className="mt-4 px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--border-color)] nm-button text-blue-500 hover:text-blue-600 active:scale-95 disabled:opacity-50"
                  >
                    {locale === 'zh' ? '导入示例文件' : 'Import Samples'}
                  </button>
                </div>
              ) : (
                files.map((file) => {
                  const isQueued = !sentFileIds.current.has(file.id);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl nm-flat border border-[var(--border-color)] hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">{getFileIcon(file.type)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate text-gray-800 dark:text-gray-100">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {file.size}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status badges */}
                        {file.status === 'processing' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        ) : isQueued ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {locale === 'zh' ? '待发送' : 'Queued'}
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {locale === 'zh' ? '已分析' : 'Loaded'}
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setFiles((prev) => prev.filter((f) => f.id !== file.id));
                            sentFileIds.current.delete(file.id);
                          }}
                          title={locale === 'zh' ? '移除文件' : 'Remove file'}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Action buttons */}
            {files.length > 0 && (
              <div className="pt-4 border-t border-[var(--border-color)] mt-4 space-y-2 flex-shrink-0">
                <button
                  onClick={() => sendMessage(t.suggestPrompt, true)}
                  disabled={isProcessing || !files.some(f => !sentFileIds.current.has(f.id))}
                  className="w-full py-2.5 text-xs font-bold rounded-xl transition-all nm-button-primary disabled:opacity-50 disabled:pointer-events-none"
                >
                  🚀 {locale === 'zh' ? '开始分析新上传文件' : 'Analyze Queue'}
                </button>
                {files.every(f => sentFileIds.current.has(f.id)) && (
                  <button
                    onClick={loadSamples}
                    disabled={isProcessing}
                    className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all nm-button border border-[var(--border-color)] text-gray-600 dark:text-gray-300"
                  >
                    🔄 {locale === 'zh' ? '导入更多示例文件' : 'Import Samples'}
                  </button>
                )}
              </div>
            )}

            {/* Close Mobile Workspace overlay */}
            {workspaceOpen && (
              <button
                onClick={() => setWorkspaceOpen(false)}
                className="mt-4 w-full py-2.5 text-sm font-semibold rounded-xl border border-[var(--border-color)] nm-button text-gray-600 dark:text-gray-300 lg:hidden flex-shrink-0"
              >
                {locale === 'zh' ? '返回对话控制台' : 'Back to Chat'}
              </button>
            )}
          </div>

          {/* Right Column: Chat Window */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col nm-flat rounded-2xl p-5 border border-[var(--border-color)] overflow-hidden h-full">
            
            {/* Activities Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 flex flex-col justify-between">
              
              <div className="space-y-4 w-full">
                {!hasConversation ? (
                  // Elegant welcome guide inside chat console
                  <div className="py-12 px-4 flex flex-col items-center justify-center text-center h-full max-w-2xl mx-auto">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center nm-flat border border-[var(--border-color)] text-blue-500 mb-6 animate-pulse">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                      {locale === 'zh' ? 'DocFlix 智能多模态文档助理' : 'DocFlix Smart Doc Assistant'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mb-8 leading-relaxed">
                      {locale === 'zh' 
                        ? '您好！我是您的智能文档处理助手。请在左侧添加文档（支持 PDF、Word、Excel、Markdown、CSV、图片及音视频），然后在这里输入分析、转换或合并指令。'
                        : 'Hello! I am your AI Document Agent. Upload files on the left and enter analysis, conversion or merge commands below.'}
                    </p>

                    {/* Quick Command Chips */}
                    <div className="w-full space-y-3 text-left">
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider pl-1">
                        {locale === 'zh' ? '💡 常用指令推荐' : '💡 Recommended Commands'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          {
                            title: locale === 'zh' ? '📊 推荐处理方案' : '📊 Suggest plans',
                            desc: locale === 'zh' ? '自动检查左侧已载入的文件，给出最佳分析和处理方案' : 'Check files and suggest analytical actions',
                            cmd: locale === 'zh' ? '我上传了这些文件，请分析它们的基本信息并给我推荐几个处理方案' : 'I uploaded these files, please analyze them and recommend processing plans.'
                          },
                          {
                            title: locale === 'zh' ? '📖 汇总文档核心摘要' : '📖 Document summary',
                            desc: locale === 'zh' ? '阅读加载的文件，提取出最核心的关键内容 and 决策要点' : 'Read loaded files and generate executive summary',
                            cmd: locale === 'zh' ? '请阅读我加载的文件，并为我写一份简洁的核心内容摘要' : 'Please read the loaded files and write a concise executive summary.'
                          },
                          {
                            title: locale === 'zh' ? '📋 将表格转换格式' : '📋 Convert spreadsheet',
                            desc: locale === 'zh' ? '将 CSV 或 Excel 数据转换为 Markdown 表格，并做汇总' : 'Convert CSV or Excel data to markdown table',
                            cmd: locale === 'zh' ? '请把数据表格转换为 Markdown 格式展示' : 'Please convert the loaded spreadsheet into Markdown format.'
                          },
                          {
                            title: locale === 'zh' ? '🔗 合并 PDF 文档' : '🔗 Merge PDFs',
                            desc: locale === 'zh' ? '如果左侧包含多份 PDF，一键合并它们并附带页码' : 'Merge multiple PDF files into one output',
                            cmd: locale === 'zh' ? '帮我把工作区里的 PDF 文件合并成一份，并确保格式完好' : 'Help me merge the PDF files in the workspace into one.'
                          }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(item.cmd)}
                            disabled={isProcessing}
                            className="p-4 text-left rounded-2xl border border-[var(--border-color)] nm-flat hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-colors group flex flex-col justify-between text-sm"
                          >
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-250 dark:text-gray-100 group-hover:text-blue-500 transition-colors">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-snug">
                              {item.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  activities.map((entry) => {
                    // ── Thinking group (collapsible) ──
                    if (entry.type === 'thinking_group') {
                      const steps: ThinkingStep[] = entry.meta?.steps || [];
                      if (steps.length === 0) return null;
                      return (
                        <div key={entry.id} className="flex items-start gap-3 min-w-0 w-full">
                          <span className="text-xs font-mono mt-3 w-14 flex-shrink-0 text-gray-500 dark:text-gray-300">{timeStr(entry.timestamp)}</span>
                          <div className="flex-1 min-w-0">
                            <ThinkingPanel
                              steps={steps}
                              collapsed={entry.meta?.collapsed ?? false}
                              isLive={entry.meta?.isLive ?? false}
                              onToggle={() => {
                                setActivities((prev) => prev.map((a) =>
                                  a.id === entry.id
                                    ? { ...a, meta: { ...a.meta, collapsed: !a.meta?.collapsed } }
                                    : a
                                ));
                              }}
                              isDark={isDark}
                              locale={locale}
                            />
                          </div>
                        </div>
                      );
                    }

                    // ── Retry card ──
                    if (entry.type === 'retry_card') {
                      return (
                        <div key={entry.id} className="flex items-start gap-3 min-w-0 w-full">
                          <span className="text-xs font-mono mt-1 w-14 flex-shrink-0 text-gray-500 dark:text-gray-300">{timeStr(entry.timestamp)}</span>
                          <div className="flex-1 rounded-2xl border p-4 bg-red-50 dark:bg-red-950/15 border-red-200 dark:border-red-800/30">
                            <p className="text-xs mb-3 text-red-600 dark:text-red-300">
                              ⚠️ {entry.content}
                            </p>
                            <button
                              onClick={() => sendMessage(entry.meta?.message)}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all nm-button text-red-500 border border-red-200 shadow-sm"
                            >
                              🔄 {locale === 'zh' ? '重新操作' : 'Retry'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // ── Standard entries ──
                    return (
                      <div key={entry.id} className="flex items-start gap-3 min-w-0 w-full">
                        <span className="text-xs font-mono mt-1 w-14 flex-shrink-0 text-gray-500 dark:text-gray-300">{timeStr(entry.timestamp)}</span>

                        {entry.type === 'user' && (
                          <>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">YOU</span>
                            <p className="text-[15px] leading-relaxed text-blue-900 dark:text-blue-100">{entry.content}</p>
                          </>
                        )}

                        {entry.type === 'system' && (
                          <p className="text-sm italic text-gray-600 dark:text-gray-400">{entry.content}</p>
                        )}

                        {/* tool_call kept for legacy/fallback rendering */}
                        {entry.type === 'tool_call' && (
                          <>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg flex-shrink-0 ${isDark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                              {locale === 'zh' ? '操作' : 'ACT'}
                            </span>
                            <span className="text-xs text-amber-700 dark:text-amber-200/80">{entry.content}</span>
                          </>
                        )}

                        {entry.type === 'suggestions' && entry.meta?.actions && (
                          <div className="flex-1 min-w-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                              {(entry.meta.actions as Array<{ id: string; emoji: string; title: string; description: string }>).map((action) => (
                                <button
                                  key={action.id}
                                  onClick={() => sendMessage(action.title)}
                                  disabled={isProcessing}
                                  className="text-left px-4 py-3 rounded-2xl border border-[var(--border-color)] nm-flat hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-colors disabled:opacity-50"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-base flex-shrink-0 mt-0.5">{action.emoji}</span>
                                    <div className="min-w-0">
                                      <p className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{action.title}</p>
                                      <p className={`text-[10px] mt-0.5 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{action.description}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.type === 'text' && (
                          <>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">AI</span>
                            <div className="flex-1 min-w-0 overflow-x-auto">
                              <StreamingText content={entry.content} isStreaming={isProcessing && entry.id === activities[activities.length - 1]?.id} />
                            </div>
                          </>
                        )}

                        {entry.type === 'file_download' && (
                          <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${isDark ? 'bg-emerald-900/20 text-emerald-400 dark:text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>FILE</span>
                            <span className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {locale === 'zh' ? '生成文件可用 ↓' : 'File ready ↓'}
                            </span>
                          </>
                        )}

                        {entry.type === 'error' && (
                          <>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">ERR</span>
                            <pre className={`text-xs overflow-x-auto max-h-20 overflow-y-auto flex-1 p-2 rounded-xl border border-[var(--border-color)] ${isDark ? 'text-red-300 bg-red-950/10' : 'text-red-600 dark:text-red-400 bg-red-50'}`}>
                              {entry.content.slice(0, 500)}
                            </pre>
                          </>
                        )}
                      </div>
                    );
                  })
                )}

                {isProcessing && (
                  <div className={`flex items-center gap-2 text-xs py-1 pl-16 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {locale === 'zh' ? '助理正在执行中...' : 'Processing...'}
                  </div>
                )}

                {/* File downloads history list */}
                {!isProcessing && activities.filter((a) => a.type === 'file_download').length > 0 && (
                  <div className="mt-6 p-4 rounded-2xl border border-[var(--border-color)] nm-pressed w-full">
                    <p className="text-sm font-bold mb-3 text-emerald-600 dark:text-emerald-400">
                      📥 {locale === 'zh' ? '已生成的可下载文件' : 'Generated Downloads'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activities.filter((a) => a.type === 'file_download').map((entry) => (
                        <a key={entry.id}
                          href={`data:application/octet-stream;base64,${entry.meta?.base64 || ''}`}
                          download={entry.content}
                          className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-[var(--border-color)] nm-flat hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors">
                          <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate block">{entry.content}</span>
                            {entry.meta?.description && (
                              <span className="text-xs text-gray-500 dark:text-gray-300 block truncate mt-0.5">{entry.meta.description}</span>
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
            <div className="pt-3 border-t border-[var(--border-color)] flex-shrink-0">
              
              {/* Dynamic queued files mini chips above text input */}
              {queuedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 px-1">
                  {queuedFiles.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-semibold border border-blue-200 dark:border-blue-900 bg-blue-500/5 text-blue-600 dark:text-blue-400 dark:text-blue-400"
                    >
                      <span>{getFileIcon(f.type)}</span>
                      <span className="max-w-[130px] truncate">{f.name}</span>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 text-blue-400 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {queuedFiles.length > 1 && (
                    <button
                      onClick={() => setFiles((prev) => prev.filter((f) => sentFileIds.current.has(f.id)))}
                      className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-red-500 hover:underline px-2 py-1 transition-colors"
                    >
                      {locale === 'zh' ? '清空待发' : 'Clear Queue'}
                    </button>
                  )}
                </div>
              )}

              {/* Input bar */}
              <div className="flex items-end gap-2 rounded-2xl p-2 nm-pressed border border-[var(--border-color)]">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title={locale === 'zh' ? '选择上传文件' : 'Attach files'}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all nm-button border border-[var(--border-color)] text-gray-400 hover:text-blue-500"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={() => { isComposingRef.current = false; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={locale === 'zh' ? '输入指令，如：提取表格数据 / 合并 PDF / 写摘要' : 'Enter command...'}
                  disabled={isProcessing}
                  className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50 py-2 px-2 text-[var(--foreground)] placeholder-gray-400"
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={(!userInput.trim() && queuedFiles.length === 0) || isProcessing}
                  className="flex-shrink-0 px-5 py-2 text-sm font-bold rounded-xl transition-all nm-button-primary disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isProcessing ? '...' : locale === 'zh' ? '发送' : 'Send'}
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
