import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { AuthProvider } from "./shared/auth/AuthContext";
import { ErrorBoundary } from "./shared/ErrorBoundary";
import "./styles.css";

// QueryClient configurado com defaults conservadores pra widget:
// - staleTime 5min: lista de empresas/pontos nao muda tao rapido
// - retry 1: falha cedo no fetch (vs default 3) pra erro chegar logo na UI
// - refetchOnWindowFocus false: evita refetch toda vez que o usuario alterna aba
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha de registro nao deve quebrar o carregamento da aplicacao.
    });
  });
}
