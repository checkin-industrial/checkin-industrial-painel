import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PontoInstitucionalListToolbar } from "./PontoInstitucionalListToolbar";
import type { StatusFiltroPonto } from "../types";

function setup(overrides: Partial<Parameters<typeof PontoInstitucionalListToolbar>[0]> = {}) {
  const onSearchTermChange = vi.fn();
  const onStatusFiltroChange = vi.fn();
  const onOpenCreateModal = vi.fn();
  const onExportCsv = vi.fn();
  const onImportCsvClick = vi.fn();
  const onImportCsvFileChange = vi.fn();
  const onRefresh = vi.fn();
  const fileInputRef = createRef<HTMLInputElement>();

  render(
    <PontoInstitucionalListToolbar
      searchTerm=""
      onSearchTermChange={onSearchTermChange}
      statusFiltro="ativos"
      onStatusFiltroChange={onStatusFiltroChange}
      onOpenCreateModal={onOpenCreateModal}
      onExportCsv={onExportCsv}
      onImportCsvClick={onImportCsvClick}
      onImportCsvFileChange={onImportCsvFileChange}
      fileInputRef={fileInputRef}
      importingCsv={false}
      onRefresh={onRefresh}
      loadingList={false}
      {...overrides}
    />,
  );

  return {
    onSearchTermChange,
    onStatusFiltroChange,
    onOpenCreateModal,
    onExportCsv,
    onImportCsvClick,
    onRefresh,
  };
}

describe("PontoInstitucionalListToolbar (smoke)", () => {
  it("renderiza input, select de status e botoes principais", () => {
    setup();
    expect(screen.getByPlaceholderText(/Buscar por nome/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Ponto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Exportar CSV$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV ANSI/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Importar CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Atualizar/i })).toBeInTheDocument();
  });

  it("mudar status dispara onStatusFiltroChange com valor tipado", () => {
    const { onStatusFiltroChange } = setup();
    const select = screen.getByDisplayValue(/Somente ativos/i);
    fireEvent.change(select, { target: { value: "inativos" } });
    expect(onStatusFiltroChange).toHaveBeenCalledWith<[StatusFiltroPonto]>("inativos");
  });

  it("click em Novo Ponto chama onOpenCreateModal", () => {
    const { onOpenCreateModal } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Novo Ponto/i }));
    expect(onOpenCreateModal).toHaveBeenCalledOnce();
  });

  it("Exportar CSV chama onExportCsv com ansi=false; ANSI chama com ansi=true", () => {
    const { onExportCsv } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Exportar CSV$/i }));
    expect(onExportCsv).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV ANSI/i }));
    expect(onExportCsv).toHaveBeenLastCalledWith(true);
  });

  it("estado importingCsv desabilita o botao + troca rotulo", () => {
    setup({ importingCsv: true });
    const importBtn = screen.getByRole("button", { name: /Importando/i });
    expect(importBtn).toBeDisabled();
  });
});
