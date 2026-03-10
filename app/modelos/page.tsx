'use client';

import { Suspense } from 'react';
import TemplatesClient from './TemplatesClient';
import { useTranslation } from '@/hooks/useTranslation';

export default function Templates() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{t('templates.loading')}</div>}>
      <TemplatesClient />
    </Suspense>
  );
}
