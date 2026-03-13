'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

/* eslint-disable react-hooks/set-state-in-effect */
export default function ThemeToggle() {
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (saved) {
            setTheme(saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme, mounted]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (!mounted) {
        return (
            <div className="px-4 py-2 border border-transparent">
                <div className="size-3 mr-2" />
                <span className="text-[10px] font-black uppercase tracking-wider opacity-0">{t('labels.darkMode')}</span>
            </div>
        );
    }

    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={isDark ? t('labels.toggleLightMode') : t('labels.toggleDarkMode')}
        >
            {isDark ? (
                <>
                    <Sun className="size-3 mr-2" />
                    {t('labels.lightMode')}
                </>
            ) : (
                <>
                    <Moon className="size-3 mr-2" />
                    {t('labels.darkMode')}
                </>
            )}
        </button>
    );
}
