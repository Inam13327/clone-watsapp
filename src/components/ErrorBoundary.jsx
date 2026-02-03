import React from 'react';
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h2>
          <div className="max-w-2xl bg-muted p-4 rounded-md overflow-auto text-left mb-6 font-mono text-xs">
            <p className="font-bold text-red-400 mb-2">{this.state.error?.toString()}</p>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </div>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
          <Button variant="outline" className="mt-2" onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
