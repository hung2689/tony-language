import React, { Component } from 'react';
import { AlertTriangle, RotateCcw, Home, RefreshCw } from 'lucide-react';

export function isChunkLoadError(error) {
  if (!error) return false;
  const message = (error.message || String(error)).toLowerCase();
  return (
    error.name === 'ChunkLoadError' ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed')
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);

    // If chunk loading failed (e.g. new deployment pruned old hashed chunks or network blip),
    // automatically reload once to fetch the latest assets from the server.
    if (isChunkLoadError(error)) {
      try {
        const reloadKey = 'chunk_reload_attempted';
        const hasReloaded = sessionStorage.getItem(reloadKey);
        if (!hasReloaded) {
          sessionStorage.setItem(reloadKey, 'true');
          window.location.reload();
          return;
        }
      } catch {
        // Ignore if sessionStorage is not accessible
      }
    }
  }

  handleReset = () => {
    try {
      sessionStorage.removeItem('chunk_reload_attempted');
    } catch {
      // Ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      sessionStorage.removeItem('chunk_reload_attempted');
    } catch {
      // Ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isChunkErr = isChunkLoadError(this.state.error);

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: isChunkErr ? '#dbeafe' : '#fee2e2',
              color: isChunkErr ? '#2563eb' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px'
            }}>
              {isChunkErr ? <RefreshCw size={26} /> : <AlertTriangle size={28} />}
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
              {isChunkErr ? 'Đã có bản cập nhật mới' : 'Đã xảy ra sự cố hiển thị'}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              {isChunkErr
                ? 'Một số tập tin tài nguyên đã được cập nhật hoặc kết nối mạng bị gián đoạn. Vui lòng bấm Tải lại trang để đồng bộ phiên bản mới nhất.'
                : 'Trang web gặp sự cố không mong muốn khi hiển thị nội dung. Bạn có thể tải lại trang hoặc quay về trang chủ.'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: isChunkErr ? 'none' : '1px solid #cbd5e1',
                  backgroundColor: isChunkErr ? '#2563eb' : '#ffffff',
                  color: isChunkErr ? '#ffffff' : '#334155',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={15} />
                <span>Tải lại trang</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isChunkErr ? '#f1f5f9' : '#0f172a',
                  color: isChunkErr ? '#334155' : '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                <span>Trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
