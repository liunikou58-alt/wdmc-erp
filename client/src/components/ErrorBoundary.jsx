import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ERP ErrorBoundary]', error, errorInfo);
  }

  // Reset on route change (children prop changes)
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: 'var(--c-text, #333)',
          maxWidth: 600,
          margin: '60px auto'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            頁面發生錯誤
          </h2>
          <p style={{ fontSize: 13, color: 'var(--c-text-muted, #888)', marginBottom: 20 }}>
            {this.state.error?.message || '未知錯誤'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--c-primary, #6366f1)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔄 重新載入
          </button>
          {/* Always show debug info in dev mode */}
          {this.state.errorInfo && (
            <details style={{ marginTop: 20, textAlign: 'left', fontSize: 11, color: '#999' }} open>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>除錯資訊</summary>
              <pre style={{ overflow: 'auto', maxHeight: 300, padding: 10, background: '#f5f5f5', borderRadius: 6, marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error?.stack || this.state.error?.toString()}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
