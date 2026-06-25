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
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='r1' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='r2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23F51522' /><stop offset='50%' stopColor='%23E50914' /><stop offset='100%' stopColor='%23B81D24' /></linearGradient><linearGradient id='r3' x1='100%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%237A050B' /></linearGradient></defs><path d='M7 4H12V28H7V4Z' fill='url(%23r1)' /><path d='M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z' fill='url(%23r2)' filter='url(%23shadow)' /><path d='M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z' fill='url(%23r3)' opacity='0.85' /><filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'><feDropShadow dx='-0.5' dy='0.5' stdDeviation='0.5' floodColor='%23000' floodOpacity='0.5'/></filter></svg>",
    shortcut: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='r1' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='r2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23F51522' /><stop offset='50%' stopColor='%23E50914' /><stop offset='100%' stopColor='%23B81D24' /></linearGradient><linearGradient id='r3' x1='100%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%237A050B' /></linearGradient></defs><path d='M7 4H12V28H7V4Z' fill='url(%23r1)' /><path d='M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z' fill='url(%23r2)' filter='url(%23shadow)' /><path d='M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z' fill='url(%23r3)' opacity='0.85' /><filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'><feDropShadow dx='-0.5' dy='0.5' stdDeviation='0.5' floodColor='%23000' floodOpacity='0.5'/></filter></svg>",
    apple: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='r1' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='r2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23F51522' /><stop offset='50%' stopColor='%23E50914' /><stop offset='100%' stopColor='%23B81D24' /></linearGradient><linearGradient id='r3' x1='100%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%237A050B' /></linearGradient></defs><path d='M7 4H12V28H7V4Z' fill='url(%23r1)' /><path d='M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z' fill='url(%23r2)' filter='url(%23shadow)' /><path d='M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z' fill='url(%23r3)' opacity='0.85' /><filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'><feDropShadow dx='-0.5' dy='0.5' stdDeviation='0.5' floodColor='%23000' floodOpacity='0.5'/></filter></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='r1' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='r2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23F51522' /><stop offset='50%' stopColor='%23E50914' /><stop offset='100%' stopColor='%23B81D24' /></linearGradient><linearGradient id='r3' x1='100%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%237A050B' /></linearGradient></defs><path d='M7 4H12V28H7V4Z' fill='url(%23r1)' /><path d='M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z' fill='url(%23r2)' filter='url(%23shadow)' /><path d='M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z' fill='url(%23r3)' opacity='0.85' /><filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'><feDropShadow dx='-0.5' dy='0.5' stdDeviation='0.5' floodColor='%23000' floodOpacity='0.5'/></filter></svg>" />
        <link rel="shortcut icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='r1' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='r2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23F51522' /><stop offset='50%' stopColor='%23E50914' /><stop offset='100%' stopColor='%23B81D24' /></linearGradient><linearGradient id='r3' x1='100%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%237A050B' /></linearGradient></defs><path d='M7 4H12V28H7V4Z' fill='url(%23r1)' /><path d='M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z' fill='url(%23r2)' filter='url(%23shadow)' /><path d='M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z' fill='url(%23r3)' opacity='0.85' /><filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'><feDropShadow dx='-0.5' dy='0.5' stdDeviation='0.5' floodColor='%23000' floodOpacity='0.5'/></filter></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><defs><linearGradient id='r1' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%239C070F' /></linearGradient><linearGradient id='r2' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stopColor='%23F51522' /><stop offset='50%' stopColor='%23E50914' /><stop offset='100%' stopColor='%23B81D24' /></linearGradient><linearGradient id='r3' x1='100%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stopColor='%23E50914' /><stop offset='100%' stopColor='%237A050B' /></linearGradient></defs><path d='M7 4H12V28H7V4Z' fill='url(%23r1)' /><path d='M12 4C20.5 4 26 9.5 26 16C26 22.5 20.5 28 12 28H15C21.5 28 26 22.5 26 16C26 9.5 21.5 4 15 4H12Z' fill='url(%23r2)' filter='url(%23shadow)' /><path d='M12 4H10C17.5 4 23 9.5 23 16C23 22.5 17.5 28 10 28H12C19.5 28 25 22.5 25 16C25 9.5 19.5 4 12 4Z' fill='url(%23r3)' opacity='0.85' /><filter id='shadow' x='-10%' y='-10%' width='120%' height='120%'><feDropShadow dx='-0.5' dy='0.5' stdDeviation='0.5' floodColor='%23000' floodOpacity='0.5'/></filter></svg>" />
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
