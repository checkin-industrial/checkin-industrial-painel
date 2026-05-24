import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TelefonesUteisManagementScreen } from "./TelefonesUteisManagementScreen";

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("TelefonesUteisManagementScreen (smoke)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renderiza loader enquanto carrega", () => {
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<TelefonesUteisManagementScreen />);
    expect(screen.getByText(/Carregando telefones úteis/i)).toBeInTheDocument();
  });

  it("renderiza lista com itens quando a API responde", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "1",
            nome: "Bombeiros",
            categoria: "EmergenciaServicosPublicos",
            telefone: "193",
            ordemExibicao: 1,
            ativo: true,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderWithClient(<TelefonesUteisManagementScreen />);

    await waitFor(() => expect(screen.getByText("Bombeiros")).toBeInTheDocument());
    expect(screen.getByText("193")).toBeInTheDocument();
  });

  it("renderiza erro quando a API falha", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    renderWithClient(<TelefonesUteisManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500|erro/i)).toBeInTheDocument();
    });
  });
});
