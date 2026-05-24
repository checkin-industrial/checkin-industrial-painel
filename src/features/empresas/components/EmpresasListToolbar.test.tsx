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
});
