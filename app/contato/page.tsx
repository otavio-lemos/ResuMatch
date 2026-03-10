'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, MapPin } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ContatoPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-[#0b1219] py-8 px-[10%]">
            <div className="w-full mx-auto">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <ArrowLeft className="mr-1.5 size-3" />
                        {t('nav.dashboard')}
                    </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-tight">{t('contact.title')}</h1>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-6 leading-relaxed font-medium">
                        {t('contact.intro')}
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded shrink-0">
                                <Mail className="size-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase">{t('contact.emailSupport')}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t('contact.emailResponseTime')}</p>
                                <a href="mailto:contato@resumatch.com" className="text-blue-600 hover:text-blue-700 font-bold text-[10px] mt-1.5 inline-block uppercase underline decoration-1 underline-offset-2">contato@resumatch.com</a>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <div className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded shrink-0">
                                <MapPin className="size-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase">{t('contact.remoteOperation')}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t('contact.remoteDescription')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <Link href="/modelos" className="flex items-center justify-center w-full rounded-lg h-10 bg-blue-600 hover:bg-blue-700 transition-all text-white font-black uppercase text-[10px] tracking-widest shadow-md">
                            {t('contact.testPlatform')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
