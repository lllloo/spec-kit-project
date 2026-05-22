import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * 章程 V：頂層 React error boundary。
 * 攔截渲染期 / lifecycle 錯誤，避免整顆 SPA 白屏；
 * 並把 error 印至 console（容器層收集到 stderr）。
 */
type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
            <h1 className="mb-2 text-2xl font-semibold text-gray-900">發生未預期的錯誤</h1>
            <p className="mb-4 text-sm text-gray-600">
              請重新整理頁面，或稍後再試。如持續發生，請聯絡管理員。
            </p>
            <pre className="mb-4 overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700">
              {this.state.error.message}
            </pre>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.reset}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                重試
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                重新整理
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
