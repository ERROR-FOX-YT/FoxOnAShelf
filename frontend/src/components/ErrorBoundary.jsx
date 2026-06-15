import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    if (this.props.onError) this.props.onError(error, info);
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, () => this.setState({ error: null, info: null }));
      return (
        <div className="flex items-center justify-center min-h-[40vh] p-8">
          <div className="rm-card p-8 max-w-lg w-full text-center space-y-4">
            <div className="text-5xl opacity-40">📖</div>
            <h2 className="font-serif text-xl font-bold text-bookshelfBrown">Algo salió mal</h2>
            <p className="text-sm opacity-70">
              {this.state.error?.message || 'Ocurrió un error inesperado al cargar esta sección.'}
            </p>
            <button
              className="btn-primary text-sm"
              onClick={() => this.setState({ error: null, info: null })}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
