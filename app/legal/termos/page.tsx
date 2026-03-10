'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Scale, ShieldAlert, UserCheck, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function TermosPage() {
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
                        <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                            <FileText className="size-5" />
                        </div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('legal.terms.title')}</h1>
                    </div>

                    <div className="max-w-none">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                            {t('legal.terms.intro')}
                        </p>

                        <div className="space-y-8">
                            {/* 1. Licença MIT */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <Scale className="size-4 text-blue-500" />
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase m-0">{t('legal.terms.mitLicense')}</h2>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                                    {t('legal.terms.mitText')}
                                </div>
                            </section>

                            {/* 2. Isenção AS-IS */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldAlert className="size-4 text-amber-500" />
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase m-0">{t('legal.terms.nature')}</h2>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold uppercase">
                                    {t('legal.terms.natureDescription')}
                                </p>
                            </section>

                            {/* 3. Limitação de Responsabilidade */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldAlert className="size-4 text-red-500" />
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase m-0">{t('legal.terms.disclaimer')}</h2>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold uppercase">
                                    {t('legal.terms.disclaimerDescription')}
                                </p>
                            </section>

                            {/* 4. Responsabilidade do Usuário */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <UserCheck className="size-4 text-emerald-500" />
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase m-0">{t('legal.terms.userResponsibility')}</h2>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.terms.userResponsibilityDescription')}
                                </p>
                            </section>

                            {/* 5. Resultados */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="size-4 text-teal-500" />
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase m-0">{t('legal.terms.employability')}</h2>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {t('legal.terms.employabilityDescription')}
                                </p>
                            </section>
                        </div>

                        <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {t('legal.terms.lastUpdate')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
