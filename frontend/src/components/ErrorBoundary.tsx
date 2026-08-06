import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  handleReset = () => {
    this.setState({ hasError: false })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-forest-950 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <h1 className="font-display text-4xl font-black text-cream-50">Something went wrong</h1>
          <p className="text-forest-400 max-w-md">
            An unexpected error occurred. Refresh the page or go back home to continue.
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 rounded-full bg-saffron-500 px-7 py-3 font-semibold text-forest-950 hover:bg-saffron-400 transition-colors"
          >
            Go back home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
