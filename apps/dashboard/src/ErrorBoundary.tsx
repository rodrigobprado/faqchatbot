import { Component, type ReactNode } from "react";

const STORAGE_KEY = "faqchatbot.dashboard.session.v1";

type ErrorBoundaryProps = Readonly<{ children: ReactNode }>;

type ErrorBoundaryState = Readonly<{ hasError: boolean }>;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    console.error("Erro inesperado na interface administrativa", error);
  }

  private readonly handleReset = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.clear();
    } catch {
      // storage indisponivel
    }

    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <article className="surface auth-card">
            <h2>Nao foi possivel exibir o painel</h2>
            <p>Ocorreu um erro inesperado na interface administrativa.</p>
            <button type="button" className="primary" onClick={this.handleReset}>
              Recarregar painel
            </button>
          </article>
        </main>
      );
    }

    return this.props.children;
  }
}
