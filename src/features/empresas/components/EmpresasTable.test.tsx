import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { EmpresasTable } from "./EmpresasTable";
import { STATUS } from "../empresaStatus";
import type { EmpresaListItem } from "../types";

function buildEmpresa(overrides: Partial<EmpresaListItem> = {}): EmpresaListItem {
  return {
    id: "emp-1",
    nomeFantasia: "Industria Bauru",
    cnaePrincipal: "2532-2/01",
    descricaoCnae: "Producao de pecas",
    setor: "Industria",
    porte: "ME",
    telefone: "(14) 3000-0000",
    cep: "17000-000",
    municipio: "Bauru",
    matrizOuFilial: "Matriz",
    latitude: -22.3,
    longitude: -49.05,
    status: STATUS.Ativo,
    ...overrides,
  };
}

describe("EmpresasTable (smoke)", () => {
  it("renderiza headers + linha com nome fantasia", () => {
    render(
      <EmpresasTable
        empresas={[buildEmpresa()]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /Nome Fantasia/i })).toBeInTheDocument();
    expect(screen.getByText("Industria Bauru")).toBeInTheDocument();
  });

  it("estado Ativo: mostra acao Excluir (e nao Reativar/Aprovar)", () => {
    render(
      <EmpresasTable
        empresas={[buildEmpresa({ status: STATUS.Ativo })]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Excluir/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reativar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprovar/i })).not.toBeInTheDocument();
  });

  it("estado Inativo: mostra acao Reativar (e nao Excluir)", () => {
    render(
      <EmpresasTable
        empresas={[buildEmpresa({ status: STATUS.Inativo })]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Reativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir/i })).not.toBeInTheDocument();
  });

  it("estado AguardandoRevisao: mostra acoes Aprovar + Rejeitar", () => {
    render(
      <EmpresasTable
        empresas={[buildEmpresa({ status: STATUS.AguardandoRevisao })]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rejeitar/i })).toBeInTheDocument();
  });

  it("click em Editar chama onEdit com o id", () => {
    const onEdit = vi.fn();
    render(
      <EmpresasTable
        empresas={[buildEmpresa({ id: "abc-123" })]}
        loadingList={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
    expect(onEdit).toHaveBeenCalledWith("abc-123");
  });

  it("lista vazia + !loading mostra empty state", () => {
    render(
      <EmpresasTable
        empresas={[]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhuma empresa encontrada/i)).toBeInTheDocument();
  });

  it("lista vazia + loading mostra spinner", () => {
    render(
      <EmpresasTable
        empresas={[]}
        loadingList={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
      />,
    );
    expect(screen.getByText(/Carregando empresas/i)).toBeInTheDocument();
  });

  it("click em Rejeitar (AguardandoRevisao) chama onDelete com o id", () => {
    const onDelete = vi.fn();
    render(
      <EmpresasTable
        empresas={[buildEmpresa({ id: "rej-1", status: STATUS.AguardandoRevisao })]}
        loadingList={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onReactivate={vi.fn()}
      />,
    );
    const row = screen.getByText(/Industria Bauru/i).closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(within(row!).getByRole("button", { name: /Rejeitar/i }));
    expect(onDelete).toHaveBeenCalledWith("rej-1");
  });
});
