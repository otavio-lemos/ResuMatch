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
      <body className="bg-slate-50 dark:bg-[#0b1219] text-slate-900 dark:text-slate-100 antialiased font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
