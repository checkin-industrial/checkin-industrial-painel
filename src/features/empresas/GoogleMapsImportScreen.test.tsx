import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleMapsImportScreen } from "./GoogleMapsImportScreen";

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("GoogleMapsImportScreen (smoke)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renderiza o form com CEP, raio, tipo e botao Importar", () => {
    renderWithClient(<GoogleMapsImportScreen />);
    expect(screen.getByText(/Importar Empresas do Google Maps/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importar/i })).toBeInTheDocument();
  });

  it("rejeita CEP invalido sem chamar a API", async () => {
    renderWithClient(<GoogleMapsImportScreen />);
    const cepInput = screen.getByPlaceholderText("17012000");
    fireEvent.change(cepInput, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /Importar/i }));

    await waitFor(() => {
      expect(screen.getByText(/CEP deve ter 8 dígitos/i)).toBeInTheDocument();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mostra resultado quando a API responde", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          operacaoId: "op-1",
          encontrados: 1,
          criados: 1,
          atualizados: 0,
          ignorados: 0,
          itens: [
            { googlePlaceId: "PLACE-1", nome: "Loja Teste", acao: "criado", empresaId: "emp-1" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderWithClient(<GoogleMapsImportScreen />);
    fireEvent.change(screen.getByPlaceholderText("17012000"), { target: { value: "17012000" } });
    fireEvent.click(screen.getByRole("button", { name: /Importar/i }));

    await waitFor(() => expect(screen.getByText("Loja Teste")).toBeInTheDocument());
    expect(screen.getByText(/Resultado da importação/i)).toBeInTheDocument();
  });
});
