import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-8 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Lỗi giao diện (React Error)</h2>
          <pre className="whitespace-pre-wrap text-sm text-red-800 bg-red-100 p-4 rounded overflow-auto">
            {this.state.error?.toString()}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
