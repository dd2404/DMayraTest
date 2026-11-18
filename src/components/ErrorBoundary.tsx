import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Ralat tidak dijangka berlaku.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
          <div className="bakery-sheet max-w-md w-full rounded-xl p-6 text-center space-y-4">
            <h2 className="font-display text-2xl font-bold text-[#831843]">
              Sistem Menghadapi Gangguan Sementara
            </h2>
            <p className="text-sm text-[#554336] break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors"
            >
              Muat Semula Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
