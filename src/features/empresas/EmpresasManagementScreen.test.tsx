import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmpresasManagementScreen } from "./EmpresasManagementScreen";

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const EMPRESA_BASE = {
  id: "1",
  nomeFantasia: "Industria Bauru S/A",
  cnaePrincipal: "25.32-2/01",
  descricaoCnae: "Producao de pecas metalicas",
  setor: "Metalurgia",
  porte: "ME",
  telefone: "(14) 3000-2222",
  cep: "17000-000",
  municipio: "Bauru",
  matrizOuFilial: "Matriz",
  latitude: -22.3,
  longitude: -49.05,
  ativo: true,
};

describe("EmpresasManagementScreen (smoke)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renderiza loader enquanto carrega", () => {
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<EmpresasManagementScreen />);
    expect(screen.getByText(/Carregando empresas/i)).toBeInTheDocument();
  });

  it("renderiza lista com itens quando a API responde", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([EMPRESA_BASE]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithClient(<EmpresasManagementScreen />);

    await waitFor(() => expect(screen.getByText("Industria Bauru S/A")).toBeInTheDocument());
  });

  it("renderiza erro quando a API falha", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    renderWithClient(<EmpresasManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500|erro/i)).toBeInTheDocument();
    });
  });
});
