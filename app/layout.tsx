import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'DocFlix - 智能文档处理与多模态分析 Agent',
    description: 'DocFlix 是由 AI Agent 驱动的智能文档处理平台。支持 PDF 合并与拆分、Word 与 PDF 格式互转、Excel 导出与 Markdown 转换，以及 PNG/JPG/WebP/GIF/BMP/TIFF 图片分析。依托安全的 EdgeOne 沙箱环境，为您提供流畅、隐私安全的一站式办公自动化解决方案。',
  keywords: [
    'DocFlix',
    '智能文档处理',
    'AI Agent',
    '多模态分析',
    'PDF合并',
    'Word转PDF',
    'Excel转Markdown',
    '图片解析',
    '办公自动化',
    'EdgeOne沙箱'
  ],
  authors: [{ name: 'DocFlix Team' }],
  creator: 'DocFlix',
  publisher: 'DocFlix',
  openGraph: {
    title: 'DocFlix - 智能文档处理与多模态分析 Agent',
    description: 'DocFlix 是由 AI Agent 驱动的智能文档处理平台。支持 PDF 合并、Word 与 PDF 转换、Excel 分析，以及 PNG/JPG/WebP/GIF/BMP/TIFF 图片分析。',
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
    icon: "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2032%2032'%20fill%3D'none'%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D'logo-bg'%20x1%3D'0%25'%20y1%3D'0%25'%20x2%3D'100%25'%20y2%3D'100%25'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23E50914'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%239C070F'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-bar'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%23ccd5e0'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-loop'%20x1%3D'0'%20y1%3D'0'%20x2%3D'1'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'50%25'%20stop-color%3D'%23ebf1f8'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%2399a7be'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D'32'%20height%3D'32'%20rx%3D'8'%20fill%3D'url(%23logo-bg)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%2016C12.5%2019.5%2015.5%2022%2019.5%2022C24%2022%2026%2019.5%2026%2016C26%2012.5%2024%2010%2019.5%2010L12.5%2010L12.5%204C21%204%2027%209%2027%2016C27%2023%2021%2028%2012.5%2028L8%2028L8%2022.5L12.5%2022.5'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3Cpath%20d%3D'M7%204H12.5V28H7Z'%20fill%3D'url(%23logo-d-bar)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%204C18%204%2023.5%207%2025.5%2011L20.5%2013.5C19%2011.5%2016%209.5%2012.5%209.5Z'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3C%2Fsvg%3E",
    shortcut: "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2032%2032'%20fill%3D'none'%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D'logo-bg'%20x1%3D'0%25'%20y1%3D'0%25'%20x2%3D'100%25'%20y2%3D'100%25'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23E50914'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%239C070F'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-bar'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%23ccd5e0'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-loop'%20x1%3D'0'%20y1%3D'0'%20x2%3D'1'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'50%25'%20stop-color%3D'%23ebf1f8'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%2399a7be'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D'32'%20height%3D'32'%20rx%3D'8'%20fill%3D'url(%23logo-bg)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%2016C12.5%2019.5%2015.5%2022%2019.5%2022C24%2022%2026%2019.5%2026%2016C26%2012.5%2024%2010%2019.5%2010L12.5%2010L12.5%204C21%204%2027%209%2027%2016C27%2023%2021%2028%2012.5%2028L8%2028L8%2022.5L12.5%2022.5'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3Cpath%20d%3D'M7%204H12.5V28H7Z'%20fill%3D'url(%23logo-d-bar)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%204C18%204%2023.5%207%2025.5%2011L20.5%2013.5C19%2011.5%2016%209.5%2012.5%209.5Z'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3C%2Fsvg%3E",
    apple: "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2032%2032'%20fill%3D'none'%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D'logo-bg'%20x1%3D'0%25'%20y1%3D'0%25'%20x2%3D'100%25'%20y2%3D'100%25'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23E50914'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%239C070F'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-bar'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%23ccd5e0'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-loop'%20x1%3D'0'%20y1%3D'0'%20x2%3D'1'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'50%25'%20stop-color%3D'%23ebf1f8'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%2399a7be'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D'32'%20height%3D'32'%20rx%3D'8'%20fill%3D'url(%23logo-bg)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%2016C12.5%2019.5%2015.5%2022%2019.5%2022C24%2022%2026%2019.5%2026%2016C26%2012.5%2024%2010%2019.5%2010L12.5%2010L12.5%204C21%204%2027%209%2027%2016C27%2023%2021%2028%2012.5%2028L8%2028L8%2022.5L12.5%2022.5'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3Cpath%20d%3D'M7%204H12.5V28H7Z'%20fill%3D'url(%23logo-d-bar)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%204C18%204%2023.5%207%2025.5%2011L20.5%2013.5C19%2011.5%2016%209.5%2012.5%209.5Z'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3C%2Fsvg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="light" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2032%2032'%20fill%3D'none'%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D'logo-bg'%20x1%3D'0%25'%20y1%3D'0%25'%20x2%3D'100%25'%20y2%3D'100%25'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23E50914'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%239C070F'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-bar'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%23ccd5e0'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-loop'%20x1%3D'0'%20y1%3D'0'%20x2%3D'1'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'50%25'%20stop-color%3D'%23ebf1f8'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%2399a7be'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D'32'%20height%3D'32'%20rx%3D'8'%20fill%3D'url(%23logo-bg)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%2016C12.5%2019.5%2015.5%2022%2019.5%2022C24%2022%2026%2019.5%2026%2016C26%2012.5%2024%2010%2019.5%2010L12.5%2010L12.5%204C21%204%2027%209%2027%2016C27%2023%2021%2028%2012.5%2028L8%2028L8%2022.5L12.5%2022.5'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3Cpath%20d%3D'M7%204H12.5V28H7Z'%20fill%3D'url(%23logo-d-bar)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%204C18%204%2023.5%207%2025.5%2011L20.5%2013.5C19%2011.5%2016%209.5%2012.5%209.5Z'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3C%2Fsvg%3E" />
        <link rel="shortcut icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2032%2032'%20fill%3D'none'%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D'logo-bg'%20x1%3D'0%25'%20y1%3D'0%25'%20x2%3D'100%25'%20y2%3D'100%25'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23E50914'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%239C070F'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-bar'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%23ccd5e0'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-loop'%20x1%3D'0'%20y1%3D'0'%20x2%3D'1'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'50%25'%20stop-color%3D'%23ebf1f8'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%2399a7be'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D'32'%20height%3D'32'%20rx%3D'8'%20fill%3D'url(%23logo-bg)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%2016C12.5%2019.5%2015.5%2022%2019.5%2022C24%2022%2026%2019.5%2026%2016C26%2012.5%2024%2010%2019.5%2010L12.5%2010L12.5%204C21%204%2027%209%2027%2016C27%2023%2021%2028%2012.5%2028L8%2028L8%2022.5L12.5%2022.5'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3Cpath%20d%3D'M7%204H12.5V28H7Z'%20fill%3D'url(%23logo-d-bar)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%204C18%204%2023.5%207%2025.5%2011L20.5%2013.5C19%2011.5%2016%209.5%2012.5%209.5Z'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3C%2Fsvg%3E" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2032%2032'%20fill%3D'none'%3E%20%3Cdefs%3E%20%3ClinearGradient%20id%3D'logo-bg'%20x1%3D'0%25'%20y1%3D'0%25'%20x2%3D'100%25'%20y2%3D'100%25'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23E50914'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%239C070F'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-bar'%20x1%3D'0'%20y1%3D'0'%20x2%3D'0'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%23ccd5e0'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3ClinearGradient%20id%3D'logo-d-loop'%20x1%3D'0'%20y1%3D'0'%20x2%3D'1'%20y2%3D'1'%3E%20%3Cstop%20offset%3D'0%25'%20stop-color%3D'%23ffffff'%20%2F%3E%20%3Cstop%20offset%3D'50%25'%20stop-color%3D'%23ebf1f8'%20%2F%3E%20%3Cstop%20offset%3D'100%25'%20stop-color%3D'%2399a7be'%20%2F%3E%20%3C%2FlinearGradient%3E%20%3C%2Fdefs%3E%20%3Crect%20width%3D'32'%20height%3D'32'%20rx%3D'8'%20fill%3D'url(%23logo-bg)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%2016C12.5%2019.5%2015.5%2022%2019.5%2022C24%2022%2026%2019.5%2026%2016C26%2012.5%2024%2010%2019.5%2010L12.5%2010L12.5%204C21%204%2027%209%2027%2016C27%2023%2021%2028%2012.5%2028L8%2028L8%2022.5L12.5%2022.5'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3Cpath%20d%3D'M7%204H12.5V28H7Z'%20fill%3D'url(%23logo-d-bar)'%20%2F%3E%20%3Cpath%20d%3D'M12.5%204C18%204%2023.5%207%2025.5%2011L20.5%2013.5C19%2011.5%2016%209.5%2012.5%209.5Z'%20fill%3D'url(%23logo-d-loop)'%20%2F%3E%20%3C%2Fsvg%3E" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = saved === 'dark' || saved === 'light' ? saved : 'light';
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
