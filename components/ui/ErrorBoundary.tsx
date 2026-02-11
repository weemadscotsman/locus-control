import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  name?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[CRITICAL] Component "${(this.props as ErrorBoundaryProps).name || 'Anonymous'}" crashed:`, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children, name } = this.props as ErrorBoundaryProps;
    
    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-[#0a0a0c] border border-red-500/20 text-red-400 font-mono text-[10px] relative overflow-hidden group select-none">
          {/* Glitch Overlay */}
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-500" />
          
          <div className="z-10 flex flex-col items-center gap-4 w-full max-w-xs text-center relative">
            <div className="font-bold tracking-[0.2em] uppercase flex items-center gap-2 text-red-500">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              Module Fault
            </div>
            
            <div className="w-full bg-black/80 p-3 border border-red-900/30 rounded text-left overflow-auto max-h-32 shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-sm">
              <div className="text-red-300 font-bold mb-2 opacity-90 uppercase text-[9px] flex justify-between border-b border-red-900/30 pb-1">
                <span>{name || 'System Module'}</span>
                <span className="font-mono opacity-50">ERR_CRIT</span>
              </div>
              <div className="opacity-80 italic whitespace-normal break-words leading-relaxed text-red-200/80">
                {error?.message || 'Unexpected kernel exception.'}
              </div>
              {errorInfo && (
                <div className="mt-2 text-[8px] opacity-40 font-mono whitespace-pre-wrap overflow-hidden h-8">
                    {errorInfo.componentStack.slice(0, 150)}...
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={this.handleReset}
              className="group relative px-6 py-2 bg-red-950/30 border border-red-500/50 text-red-400 hover:text-white transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/80 transition-all duration-300" />
              <span className="relative z-10 font-bold tracking-widest uppercase text-[9px]">Re-Initialize</span>
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
