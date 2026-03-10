'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 m-4">
                    <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                        <AlertCircle className="size-6" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ops! Algo deu errado.</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                        Ocorreu um erro inesperado ao renderizar este componente. Fique tranquilo, seus dados foram salvos.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-sm font-medium"
                    >
                        <RefreshCw className="size-4" />
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
