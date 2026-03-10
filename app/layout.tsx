import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'ResuMatch - Resumes Optimized for ATS',
  description: 'Create a resume that robots (and humans) will love',
  openGraph: {
    title: 'ResuMatch | Create an ATS-Friendly Resume',
    description: 'Our technology ensures your resume is read perfectly by ATS systems and human recruiters',
    type: 'website',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
              if (!theme && supportDarkMode) theme = 'dark';
              if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body className="bg-slate-50 dark:bg-[#0b1219] text-slate-900 dark:text-slate-100 antialiased font-sans" style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <ClientLayout>{children}</ClientLayout>
        <div id="google_translate_element" style={{ display: 'none' }}></div>
        <script dangerouslySetInnerHTML={{
          __html: `
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,pt',
              autoDisplay: false
            }, 'google_translate_element');
          }
        `}} />
        <script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async />
      </body>
    </html>
  );
}
