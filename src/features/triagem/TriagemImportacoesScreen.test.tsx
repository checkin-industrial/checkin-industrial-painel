import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TriagemImportacoesScreen } from "./TriagemImportacoesScreen";
import type { ImportCandidate } from "./types";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const candidatePendente: ImportCandidate = {
  id: "cand-1",
  googlePlaceId: "PLACE-1",
  nome: "Hotel ABC",
  formattedAddress: "Rua X, 100",
  latitude: -22.6,
  longitude: -48.8,
  telefone: "(14) 3333-4444",
  types: ["hotel", "lodging"],
  cepOrigem: "18681420",
  criadoEm: new Date().toISOString(),
  empresaStatus: "pendente",
  empresaId: null,
  empresaDecididoEm: null,
  pontoStatus: "pendente",
  pontoInstitucionalId: null,
  pontoDecididoEm: null,
  telefoneStatus: "pendente",
  telefoneUtilId: null,
  telefoneDecididoEm: null,
};

const candidateParcial: ImportCandidate = {
  ...candidatePendente,
  id: "cand-2",
  nome: "Restaurante Y",
  empresaStatus: "aprovado",
  empresaId: "emp-1",
  empresaDecididoEm: new Date().toISOString(),
  telefoneStatus: "rejeitado",
};

describe("TriagemImportacoesScreen", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([candidatePendente, candidateParcial]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it("renderiza titulo e total de candidates", async () => {
    renderWithQuery(<TriagemImportacoesScreen />);
    expect(screen.getByText(/Triagem de Importações Google Maps/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Total exibido: 2/i)).toBeInTheDocument());
  });

  it("candidato pendente mostra os 3 botoes de promotion", async () => {
    renderWithQuery(<TriagemImportacoesScreen />);
    await waitFor(() => expect(screen.getByText("Hotel ABC")).toBeInTheDocument());

    // 3 destinos x 2 candidates (so o pendente tem todos os 3) — mas o
    // parcial tambem mostra Ponto Institucional (so Empresa = aprovado e
    // Telefone = rejeitado). Entao: 3 + 1 = 4 botoes "promover X" no total.
    expect(screen.getAllByRole("button", { name: /^Empresa$/i }).length).toBe(1);  // so o pendente
    expect(screen.getAllByRole("button", { name: /^Ponto Institucional$/i }).length).toBe(2);  // ambos
    expect(screen.getAllByRole("button", { name: /^Telefone Útil$/i }).length).toBe(1);  // so o pendente
  });

  it("candidato com decisao mostra badge ao inves de botao", async () => {
    renderWithQuery(<TriagemImportacoesScreen />);
    await waitFor(() => expect(screen.getByText("Restaurante Y")).toBeInTheDocument());

    // Empresa aprovada → badge "✓ Empresa"
    expect(screen.getByText("✓ Empresa")).toBeInTheDocument();
    // Telefone rejeitado → badge "✗ Telefone Útil (rejeitado)"
    expect(screen.getByText(/✗ Telefone Útil \(rejeitado\)/i)).toBeInTheDocument();
  });

  it("filtro de status muda query e refetch", async () => {
    renderWithQuery(<TriagemImportacoesScreen />);
    await waitFor(() => expect(screen.getByText("Hotel ABC")).toBeInTheDocument());

    // Inicial: pendente
    const firstCall = fetchSpy.mock.calls[0]?.[0] as string;
    expect(firstCall).toContain("status=pendente");
  });
});
