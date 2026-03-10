'use client';

import { useEffect, useRef } from 'react';
import { useResumeStore } from '@/store/useResumeStore';

export function AutoSaveSync() {
    const data = useResumeStore(state => state.data);
    const syncStatus = useResumeStore(state => state.syncStatus);
    const saveLocalResume = useResumeStore(state => state.saveLocalResume);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Evitar salvar na primeira montagem (apenas carregar)
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Se estiver carregando ou já estiver salvando, não dispara outro save
        if (syncStatus === 'loading' || syncStatus === 'saving') {
            return;
        }

        // Debounce de 1.5s antes de bater no banco para salvar as alterações
        const timeoutId = setTimeout(() => {
            saveLocalResume();
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [data, saveLocalResume, syncStatus]);

    return null;
}
