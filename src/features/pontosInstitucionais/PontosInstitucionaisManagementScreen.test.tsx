import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PontosInstitucionaisManagementScreen } from "./PontosInstitucionaisManagementScreen";

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const PONTO_BASE = {
  id: "1",
  nome: "Centro de Atendimento Industrial",
  tipo: "SetorPrefeitura",
  descricao: "Atendimento ao setor industrial",
  endereco: "Av. Industrial, 500",
  atividadesDisponiveis: "Apoio a empresas",
  equipeGestao: "Equipe Gestao",
  contatoNome: "Joao",
  contatoTelefone: "(14) 3000-1111",
  contatoEmail: "industrial@cidade.gov.br",
  responsavelFotoUrl: null,
  logoUrl: null,
  cardFotoUrl: null,
  latitude: -22.7,
  longitude: -49.1,
  corMarcador: "#000",
  iconeMarcador: "SOC",
  ordemExibicao: 1,
  ativo: true,
};

describe("PontosInstitucionaisManagementScreen (smoke)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renderiza loader enquanto carrega", () => {
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<PontosInstitucionaisManagementScreen />);
    expect(screen.getByText(/Carregando pontos institucionais/i)).toBeInTheDocument();
  });

  it("renderiza lista com itens quando a API responde", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([PONTO_BASE]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithClient(<PontosInstitucionaisManagementScreen />);

    await waitFor(() =>
      expect(screen.getByText("Centro de Atendimento Industrial")).toBeInTheDocument(),
    );
  });

  it("renderiza erro quando a API falha", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    renderWithClient(<PontosInstitucionaisManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500|erro/i)).toBeInTheDocument();
    });
  });
});
