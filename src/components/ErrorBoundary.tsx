import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('king_store_current_user');
      localStorage.removeItem('kingstore_currency');
      localStorage.removeItem('kingstore_lang');
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/20 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-amber-500">حدث خطأ غير متوقع في النظام 👑</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                نعتذر منك، لقد واجهت البوابة الملكية مشكلة أثناء التشغيل. قد يكون السبب تعارض في البيانات المحلية أو مشكلة في الاتصال.
              </p>
            </div>

            {this.state.error && (
              <div className="text-right bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-zinc-400 overflow-auto max-h-32 leading-relaxed">
                <strong>تفاصيل الخطأ:</strong> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 text-sm active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                id="reset-pwa-portal"
              >
                <RefreshCw className="h-4 w-4" />
                <span>إعادة تحميل البوابة</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 text-sm active:scale-95 transition-all cursor-pointer border border-slate-700"
                id="home-pwa-portal"
              >
                <Home className="h-4 w-4" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
