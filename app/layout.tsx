import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'DocFlix - 智能文档处理与多模态分析 Agent',
  description: 'DocFlix 是由 AI Agent 驱动的智能多模态文档处理平台。支持 PDF 合并与拆分、Word 与 PDF 格式互转、Excel 导出与 Markdown 转换、智能图片分析以及视频音视频内容提取解析。依托安全的 EdgeOne 沙箱环境，为您提供流畅、隐私安全的一站式办公自动化解决方案。',
  keywords: [
    'DocFlix',
    '智能文档处理',
    'AI Agent',
    '多模态分析',
    'PDF合并',
    'Word转PDF',
    'Excel转Markdown',
    '图片解析',
    '音视频分析',
    '办公自动化',
    'EdgeOne沙箱'
  ],
  authors: [{ name: 'DocFlix Team' }],
  creator: 'DocFlix',
  publisher: 'DocFlix',
  openGraph: {
    title: 'DocFlix - 智能文档处理与多模态分析 Agent',
    description: 'DocFlix 是由 AI Agent 驱动的智能多模态文档处理平台。支持 PDF 合并、Word与PDF转换、Excel分析、智能图片分析及视频解析。',
    url: 'https://docflix.ai',
    siteName: 'DocFlix',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DocFlix - 智能文档处理与多模态分析 Agent',
    description: 'AI 驱动的多模态文档处理与格式转换平台',
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='logo-bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='logo-d-bar' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23dce3ee' /></linearGradient><linearGradient id='logo-d-loop' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23a4b8d4' /></linearGradient><linearGradient id='logo-d-inner' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ff4d4d' /><stop offset='100%' stopColor='%23990000' /></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23logo-bg)' /><path d='M7 4 H12.5 V28 H7 Z' fill='url(%23logo-d-bar)' /><path d='M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z' fill='url(%23logo-d-inner)' /><path d='M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z' fill='url(%23logo-d-loop)' /></svg>",
    shortcut: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='logo-bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='logo-d-bar' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23dce3ee' /></linearGradient><linearGradient id='logo-d-loop' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23a4b8d4' /></linearGradient><linearGradient id='logo-d-inner' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ff4d4d' /><stop offset='100%' stopColor='%23990000' /></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23logo-bg)' /><path d='M7 4 H12.5 V28 H7 Z' fill='url(%23logo-d-bar)' /><path d='M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z' fill='url(%23logo-d-inner)' /><path d='M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z' fill='url(%23logo-d-loop)' /></svg>",
    apple: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='logo-bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='logo-d-bar' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23dce3ee' /></linearGradient><linearGradient id='logo-d-loop' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23a4b8d4' /></linearGradient><linearGradient id='logo-d-inner' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ff4d4d' /><stop offset='100%' stopColor='%23990000' /></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23logo-bg)' /><path d='M7 4 H12.5 V28 H7 Z' fill='url(%23logo-d-bar)' /><path d='M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z' fill='url(%23logo-d-inner)' /><path d='M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z' fill='url(%23logo-d-loop)' /></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='logo-bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='logo-d-bar' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23dce3ee' /></linearGradient><linearGradient id='logo-d-loop' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23a4b8d4' /></linearGradient><linearGradient id='logo-d-inner' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ff4d4d' /><stop offset='100%' stopColor='%23990000' /></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23logo-bg)' /><path d='M7 4 H12.5 V28 H7 Z' fill='url(%23logo-d-bar)' /><path d='M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z' fill='url(%23logo-d-inner)' /><path d='M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z' fill='url(%23logo-d-loop)' /></svg>" />
        <link rel="shortcut icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='logo-bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='logo-d-bar' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23dce3ee' /></linearGradient><linearGradient id='logo-d-loop' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23a4b8d4' /></linearGradient><linearGradient id='logo-d-inner' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ff4d4d' /><stop offset='100%' stopColor='%23990000' /></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23logo-bg)' /><path d='M7 4 H12.5 V28 H7 Z' fill='url(%23logo-d-bar)' /><path d='M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z' fill='url(%23logo-d-inner)' /><path d='M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z' fill='url(%23logo-d-loop)' /></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='logo-bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='logo-d-bar' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23dce3ee' /></linearGradient><linearGradient id='logo-d-loop' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stopColor='%23ffffff' /><stop offset='100%' stopColor='%23a4b8d4' /></linearGradient><linearGradient id='logo-d-inner' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stopColor='%23ff4d4d' /><stop offset='100%' stopColor='%23990000' /></linearGradient></defs><rect width='32' height='32' rx='8' fill='url(%23logo-bg)' /><path d='M7 4 H12.5 V28 H7 Z' fill='url(%23logo-d-bar)' /><path d='M12.5 9.5 C15.5 9.5 17.5 11.5 17.5 16 C17.5 20.5 15.5 22.5 12.5 22.5 L12.5 28 C20.5 28 23 22 23 16 C23 10 20.5 4 12.5 4 Z' fill='url(%23logo-d-inner)' /><path d='M12.5 4 C20.5 4 27 9.4 27 16 C27 22.6 20.5 28 12.5 28 L12.5 22.5 C17.5 22.5 21.5 20 21.5 16 C 21.5 12 17.5 9.5 12.5 9.5 Z' fill='url(%23logo-d-loop)' /></svg>" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = saved === 'dark' || saved === 'light' ? saved : 'dark';
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-screen overflow-hidden antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
