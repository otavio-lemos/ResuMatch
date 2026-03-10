'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function PrivacidadePage() {
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

                <div className="bg-white dark:bg-slate-900 rounded-none shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                            <ShieldCheck className="size-5" />
                        </div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('legal.privacy.title')}</h1>
                    </div>

                    <div className="max-w-none">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed font-medium">
                            {t('legal.privacy.intro')}
                        </p>

                        <div className="space-y-6">
                            <section>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase">1. {t('legal.privacy.collection')}</h2>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.privacy.collectionDescription')}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase">2. {t('legal.privacy.purpose')}</h2>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.privacy.purposeDescription')}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase">3. {t('legal.privacy.security')}</h2>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.privacy.securityDescription')}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase">4. {t('legal.privacy.storage')}</h2>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.privacy.storageDescription')}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase">5. {t('legal.privacy.lgpd')}</h2>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.privacy.lgpdDescription')}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase">6. {t('legal.privacy.maintenance')}</h2>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.privacy.maintenanceDescription')}
                                </p>
                            </section>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {t('legal.privacy.lastUpdate')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
