import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PontosInstitucionaisCardsScreen } from "./PontosInstitucionaisCardsScreen";

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const PONTO_BASE = {
  id: "1",
  nome: "Posto de Saúde Central",
  tipo: "SetorPrefeitura",
  descricao: "Atendimento basico",
  endereco: "Rua A, 100",
  atividadesDisponiveis: "Consultas",
  equipeGestao: "Equipe X",
  contatoNome: "Maria",
  contatoTelefone: "(14) 3000-0000",
  contatoEmail: "contato@cidade.gov.br",
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

describe("PontosInstitucionaisCardsScreen (smoke)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renderiza loader enquanto carrega", () => {
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<PontosInstitucionaisCardsScreen />);
    expect(screen.getByText(/Carregando locais úteis/i)).toBeInTheDocument();
  });

  it("renderiza cards quando a API responde com dados", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([PONTO_BASE]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithClient(<PontosInstitucionaisCardsScreen />);

    await waitFor(() => expect(screen.getAllByText("Posto de Saúde Central").length).toBeGreaterThan(0));
  });

  it("renderiza erro quando a API falha", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    renderWithClient(<PontosInstitucionaisCardsScreen />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500|erro/i)).toBeInTheDocument();
    });
  });
});
