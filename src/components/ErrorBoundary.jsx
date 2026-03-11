import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Error is already captured in state via getDerivedStateFromError
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Arial' }}>
          <h2 style={{ color: '#e53e3e' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: 20 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            style={{
              padding: '10px 24px',
              background: '#764ba2',
              color: '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            Go to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
