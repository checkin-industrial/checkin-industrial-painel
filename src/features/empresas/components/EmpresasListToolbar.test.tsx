import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmpresasListToolbar } from "./EmpresasListToolbar";
import type { StatusFiltro } from "../types";

function setup(overrides: Partial<Parameters<typeof EmpresasListToolbar>[0]> = {}) {
  const onSearchTermChange = vi.fn();
  const onStatusFiltroChange = vi.fn();
  const onOpenCreateModal = vi.fn();
  const onRefresh = vi.fn();

  render(
    <EmpresasListToolbar
      searchTerm=""
      onSearchTermChange={onSearchTermChange}
      statusFiltro="ativo"
      onStatusFiltroChange={onStatusFiltroChange}
      onOpenCreateModal={onOpenCreateModal}
      onRefresh={onRefresh}
      loadingList={false}
      {...overrides}
    />,
  );

  return { onSearchTermChange, onStatusFiltroChange, onOpenCreateModal, onRefresh };
}

describe("EmpresasListToolbar (smoke)", () => {
  it("renderiza input de busca, select de status e botoes principais", () => {
    setup();
    expect(screen.getByPlaceholderText(/Buscar por nome/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Filtro de status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova Empresa/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Atualizar/i })).toBeInTheDocument();
  });

  it("digitar no input dispara onSearchTermChange", () => {
    const { onSearchTermChange } = setup();
    const input = screen.getByPlaceholderText(/Buscar por nome/i);
    fireEvent.change(input, { target: { value: "metalurgia" } });
    expect(onSearchTermChange).toHaveBeenCalledWith("metalurgia");
  });

  it("mudar status dispara onStatusFiltroChange com o valor tipado", () => {
    const { onStatusFiltroChange } = setup();
    const select = screen.getByRole("combobox", { name: /Filtro de status/i });
    fireEvent.change(select, { target: { value: "aguardando-revisao" } });
    expect(onStatusFiltroChange).toHaveBeenCalledWith<[StatusFiltro]>("aguardando-revisao");
  });

  it("click em Nova Empresa chama onOpenCreateModal", () => {
    const { onOpenCreateModal } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Nova Empresa/i }));
    expect(onOpenCreateModal).toHaveBeenCalledOnce();
  });

  it("desabilita botao Atualizar e troca rotulo durante loadingList", () => {
    setup({ loadingList: true });
    const refreshButton = screen.getByRole("button", { name: /Atualizando/i });
    expect(refreshButton).toBeDisabled();
  });

  it("sem handlers de CSV, os botoes de Export/Import NAO renderizam", () => {
    setup();
    expect(screen.queryByRole("button", { name: /Exportar CSV/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar CSV/i })).not.toBeInTheDocument();
  });

  it("com handlers de CSV, renderiza os 3 botoes (Exportar UTF-8 + ANSI + Importar)", () => {
    const onExportCsv = vi.fn();
    const onImportCsvClick = vi.fn();
    const onImportCsvFileChange = vi.fn();
    setup({ onExportCsv, onImportCsvClick, onImportCsvFileChange });

    expect(screen.getByRole("button", { name: /^Exportar CSV$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV ANSI/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Importar CSV$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Exportar CSV$/i }));
    expect(onExportCsv).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV ANSI/i }));
    expect(onExportCsv).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: /^Importar CSV$/i }));
    expect(onImportCsvClick).toHaveBeenCalledOnce();
  });

  it("durante importingCsv, botao Importar fica desabilitado com label 'Importando...'", () => {
    setup({
      onExportCsv: vi.fn(),
      onImportCsvClick: vi.fn(),
      onImportCsvFileChange: vi.fn(),
      importingCsv: true,
    });
    const btn = screen.getByRole("button", { name: /Importando/i });
    expect(btn).toBeDisabled();
  });

  // Export e import sao independentes (Copilot feedback PR #43): telas podem
  // expor so um deles sem precisar passar handlers fake do outro.

  it("so onExportCsv renderiza apenas Exportar UTF-8 + ANSI (sem Importar)", () => {
    setup({ onExportCsv: vi.fn() });
    expect(screen.getByRole("button", { name: /^Exportar CSV$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV ANSI/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar CSV/i })).not.toBeInTheDocument();
  });

  it("so onImportCsv* renderiza apenas Importar (sem Exportar)", () => {
    setup({ onImportCsvClick: vi.fn(), onImportCsvFileChange: vi.fn() });
    expect(screen.queryByRole("button", { name: /Exportar CSV/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importar CSV/i })).toBeInTheDocument();
  });
});
