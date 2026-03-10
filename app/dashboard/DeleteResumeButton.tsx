'use client';

import { Trash2, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteResume } from './actions';

export function DeleteResumeButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!showConfirm) {
            setShowConfirm(true);
            setTimeout(() => setShowConfirm(false), 3000);
            return;
        }

        startTransition(async () => {
            try {
                await deleteResume(id);
                router.push('/');
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Falha ao excluir currículo');
            }
        });
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className={`p-2 rounded-lg shadow-sm border transition-all absolute top-3 left-3 z-20 ${
                showConfirm 
                    ? 'bg-red-600 border-red-600 text-white w-auto px-3 flex items-center gap-2' 
                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100'
            }`}
            title={showConfirm ? "Clique novamente para confirmar" : "Excluir currículo"}
        >
            {isPending ? (
                <Loader2 className="size-4 animate-spin" />
            ) : showConfirm ? (
                <>
                    <Trash2 className="size-4" />
                    <span className="text-[10px] font-bold">Confirmar?</span>
                </>
            ) : (
                <Trash2 className="size-4" />
            )}
        </button>
    );
}
