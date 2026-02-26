import React from 'react';

interface Props {
  children?: React.ReactNode;
  name?: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.name || 'unnamed'}]`, error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-black/90 border-2 border-red-500/50 text-red-400 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ff0000_10px,#ff0000_11px)]" />
          
          <div className="relative z-10 flex flex-col items-center gap-4 max-w-full">
            <div className="text-xl font-bold tracking-widest animate-pulse">SYSTEM FAILURE</div>
            
            {this.props.name && (
              <span className="text-amber-400 text-xs font-mono border border-amber-900/50 px-2 py-1 bg-black/50">
                MODULE: {this.props.name}
              </span>
            )}

            <div className="w-full max-w-md bg-black/50 border border-red-900/30 p-2 overflow-auto max-h-32 text-[10px] font-mono">
              <div className="mb-2 text-red-300 font-bold">{this.state.error?.message || 'Unknown Error'}</div>
              {this.state.errorInfo && (
                <pre className="opacity-50 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <button 
              onClick={this.handleReset}
              className="px-6 py-2 bg-red-900/20 hover:bg-red-900/50 border border-red-500 text-red-500 hover:text-white transition-all text-xs font-bold tracking-widest uppercase"
            >
              Restart Process
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}