import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Error boundary global. Captura erros nao tratados em qualquer descendente
 * (incluindo erros em fetches, render, useEffect que lancem).
 *
 * Sem ele, um throw num componente quebra a tela inteira sem fallback.
 *
 * Uso: envolver <App /> em main.tsx (ja feito).
 */
type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sem APM/Sentry aqui (escopo widget). Log no console para o dev.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        role="alert"
        style={{
          padding: "2rem",
          maxWidth: 560,
          margin: "4rem auto",
          fontFamily: "system-ui, sans-serif",
          color: "#1f2937",
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: 8,
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem", color: "#991b1b" }}>Algo deu errado</h2>
        <p style={{ margin: "0 0 1rem" }}>
          Encontramos um erro inesperado ao processar esta tela.
          Tente novamente. Se o erro persistir, contate o suporte.
        </p>
        <details style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#475569" }}>
          <summary style={{ cursor: "pointer" }}>Detalhes tecnicos</summary>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: "0.5rem" }}>
            {error.name}: {error.message}
          </pre>
        </details>
        <button
          type="button"
          onClick={this.reset}
          style={{
            padding: "0.5rem 1rem",
            background: "#16396d",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
