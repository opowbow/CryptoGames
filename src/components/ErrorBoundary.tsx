import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
          <div className="max-w-xl w-full bg-slate-800 p-6 rounded-xl border border-red-500/50">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <pre className="bg-slate-950 p-4 rounded-lg overflow-auto text-sm font-mono text-slate-300">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
