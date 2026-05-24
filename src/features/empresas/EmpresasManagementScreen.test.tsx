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
  status: 1,
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

  it("pendingEditId dispara fetch do detalhe + onEditConsumed", async () => {
    // 1) GET /api/empresas/filter (lista vazia ok pra esse teste)
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // 2) GET /api/empresas/{id} (detalhe disparado pelo deep-link)
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "abc-123",
          cnpj: "12345678000100",
          razaoSocial: "Deep Link Empresa LTDA",
          nomeFantasia: "Deep Link",
          cnaePrincipal: "0000000",
          descricaoCnae: "",
          setor: 1,
          porte: 2,
          numeroFuncionarios: 5,
          endereco: "Rua X, 1",
          telefone: "",
          cep: "01000000",
          municipio: "Bauru",
          matrizOuFilialCodigo: 1,
          latitude: -22.3,
          longitude: -49.05,
          situacaoCadastral: 1,
          status: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const onEditConsumed = vi.fn();
    renderWithClient(
      <EmpresasManagementScreen pendingEditId="abc-123" onEditConsumed={onEditConsumed} />,
    );

    await waitFor(() => expect(onEditConsumed).toHaveBeenCalled());
    // Modal de edicao aberto -> titulo "Editar Empresa" presente
    await waitFor(() => expect(screen.getByText(/Editar Empresa/i)).toBeInTheDocument());
  });
});
