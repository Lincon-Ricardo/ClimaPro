import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { log } from '../lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error('ErrorBoundary', error.message, { stack: error.stack?.slice(0, 1000), componentStack: errorInfo.componentStack?.slice(0, 1000) });
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = String(this.state.error?.message || '').includes('dynamically imported module')
        || String(this.state.error?.message || '').includes('Loading chunk');
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-900">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <AlertTriangle size={32} className="text-red-600 dark:text-red-300" />
              </div>
            </div>
            <h1 className="mt-4 text-center text-2xl font-bold text-neutral-800 dark:text-neutral-100">
              {isChunkError ? 'Nova versão disponível' : 'Algo deu errado'}
            </h1>
            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
              {isChunkError
                ? 'Publicamos uma atualização. Clique abaixo para carregar a versão nova.'
                : 'Desculpe, encontramos um erro inesperado. Tente recarregar a página.'}
            </p>
            {!isChunkError && (
              <details className="mt-4 max-h-32 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <summary className="cursor-pointer font-semibold">Detalhes técnicos</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error?.message}</pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {isChunkError ? 'Atualizar agora' : 'Recarregar página'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
