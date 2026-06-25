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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="dark" suppressHydrationWarning>
      <head>
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
