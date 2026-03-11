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
        <div className="error-boundary">
          <div className="error-boundary-icon">😵</div>
          <h2>Something went wrong</h2>
          <p>
            An unexpected error occurred. Please try again.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/login';
            }}
          >
            Return to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
