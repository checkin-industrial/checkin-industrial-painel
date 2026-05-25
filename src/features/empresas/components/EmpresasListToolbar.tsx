import type { ChangeEvent, RefObject } from "react";
import type { StatusFiltro } from "../types";

type EmpresasListToolbarProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFiltro: StatusFiltro;
  onStatusFiltroChange: (value: StatusFiltro) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  loadingList: boolean;
  // CSV: opcional pra manter componente reutilizavel em telas sem export
  onExportCsv?: (ansi: boolean) => void;
  onImportCsvClick?: () => void;
  onImportCsvFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  importingCsv?: boolean;
};

// Barra superior da lista admin: busca livre, filtro de status, botoes
// "Nova Empresa" e "Atualizar". Sem estado proprio - tudo controlado pelo
// container. Os botoes de CSV (Exportar/Importar) aparecem so quando os
// handlers correspondentes sao passados (gracefully degrada em testes/screens
// que nao precisam).
export function EmpresasListToolbar({
  searchTerm,
  onSearchTermChange,
  statusFiltro,
  onStatusFiltroChange,
  onOpenCreateModal,
  onRefresh,
  loadingList,
  onExportCsv,
  onImportCsvClick,
  onImportCsvFileChange,
  fileInputRef,
  importingCsv = false,
}: EmpresasListToolbarProps) {
  const csvEnabled = Boolean(onExportCsv && onImportCsvClick && onImportCsvFileChange);

  return (
    <div className="company-list-toolbar">
      <input
        type="search"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        placeholder="Buscar por nome, CNAE, município, telefone ou CEP"
        aria-label="Buscar empresas por nome, CNAE, município, telefone ou CEP"
      />
      <select
        value={statusFiltro}
        onChange={(event) => onStatusFiltroChange(event.target.value as StatusFiltro)}
        aria-label="Filtro de status"
      >
        <option value="ativo">Somente ativas</option>
        <option value="inativo">Somente inativas</option>
        <option value="aguardando-revisao">Aguardando revisão</option>
        <option value="todos">Todas</option>
      </select>
      <button type="button" className="btn-with-icon btn-action-new" onClick={onOpenCreateModal}>
        Nova Empresa
      </button>
      <button
        type="button"
        className="ghost btn-with-icon btn-action-refresh"
        onClick={onRefresh}
        disabled={loadingList}
      >
        {loadingList ? "Atualizando..." : "Atualizar"}
      </button>
      {csvEnabled && (
        <>
          <button type="button" className="ghost btn-with-icon" onClick={() => onExportCsv?.(false)}>
            Exportar CSV
          </button>
          <button type="button" className="ghost btn-with-icon" onClick={() => onExportCsv?.(true)}>
            Exportar CSV ANSI
          </button>
          <button
            type="button"
            className="ghost btn-with-icon"
            onClick={onImportCsvClick}
            disabled={importingCsv}
          >
            {importingCsv ? "Importando..." : "Importar CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onImportCsvFileChange}
            style={{ display: "none" }}
            aria-label="Selecionar arquivo CSV de empresas"
          />
        </>
      )}
    </div>
  );
}
