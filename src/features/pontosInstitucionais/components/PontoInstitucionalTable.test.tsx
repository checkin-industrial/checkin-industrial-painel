import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PontoInstitucionalTable } from "./PontoInstitucionalTable";
import type { PontoInstitucionalListItem } from "../types";

function buildPonto(overrides: Partial<PontoInstitucionalListItem> = {}): PontoInstitucionalListItem {
  return {
    id: "ponto-1",
    nome: "SENAI Bauru",
    tipo: "educacao",
    descricao: "Centro de educacao profissional",
    endereco: "Rua das Industrias, 1000",
    latitude: -22.3,
    longitude: -49.05,
    atividadesDisponiveis: "Cursos tecnicos",
    equipeGestao: "Diretoria pedagogica",
    contatoNome: "Maria Silva",
    contatoTelefone: "(14) 3232-0000",
    contatoEmail: "contato@senai.example.com",
    responsavelFotoUrl: null,
    logoUrl: null,
    cardFotoUrl: null,
    corMarcador: "#0d9488",
    iconeMarcador: "educacao",
    ordemExibicao: 1,
    ativo: true,
    ...overrides,
  };
}

describe("PontoInstitucionalTable (smoke)", () => {
  it("renderiza headers + linha com nome do ponto", () => {
    render(
      <PontoInstitucionalTable
        pontos={[buildPonto()]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /Nome/i })).toBeInTheDocument();
    expect(screen.getByText("SENAI Bauru")).toBeInTheDocument();
  });

  it("ativo: mostra Desativar e nao Reativar", () => {
    render(
      <PontoInstitucionalTable
        pontos={[buildPonto({ ativo: true })]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Desativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reativar/i })).not.toBeInTheDocument();
  });

  it("inativo: mostra Reativar e nao Desativar", () => {
    render(
      <PontoInstitucionalTable
        pontos={[buildPonto({ ativo: false })]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Reativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Desativar/i })).not.toBeInTheDocument();
  });

  it("click em Editar chama onEdit com id", () => {
    const onEdit = vi.fn();
    render(
      <PontoInstitucionalTable
        pontos={[buildPonto({ id: "p-42" })]}
        loadingList={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
    expect(onEdit).toHaveBeenCalledWith("p-42");
  });

  it("click em Reativar (inativo) chama onReactivate com o item", () => {
    const onReactivate = vi.fn();
    const inativo = buildPonto({ ativo: false });
    render(
      <PontoInstitucionalTable
        pontos={[inativo]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={onReactivate}
      />,
    );
    const row = screen.getByText("SENAI Bauru").closest("tr");
    fireEvent.click(within(row!).getByRole("button", { name: /Reativar/i }));
    expect(onReactivate).toHaveBeenCalledWith(inativo);
  });

  it("lista vazia + !loading mostra empty state", () => {
    render(
      <PontoInstitucionalTable
        pontos={[]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhum ponto institucional encontrado/i)).toBeInTheDocument();
  });

  it("lista vazia + loading mostra spinner", () => {
    render(
      <PontoInstitucionalTable
        pontos={[]}
        loadingList={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Carregando pontos institucionais/i)).toBeInTheDocument();
  });
});
