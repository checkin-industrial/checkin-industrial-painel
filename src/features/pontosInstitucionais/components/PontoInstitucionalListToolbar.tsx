import { ChangeEvent, RefObject } from "react";
import type { StatusFiltroPonto } from "../types";

type PontoInstitucionalListToolbarProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFiltro: StatusFiltroPonto;
  onStatusFiltroChange: (value: StatusFiltroPonto) => void;
  onOpenCreateModal: () => void;
  onExportCsv: (ansi: boolean) => void;
  onImportCsvClick: () => void;
  onImportCsvFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  importingCsv: boolean;
  onRefresh: () => void;
  loadingList: boolean;
};

// Barra superior da lista de pontos institucionais. Stateless - tudo
// controlado pelo container (PontosInstitucionaisManagementScreen).
export function PontoInstitucionalListToolbar({
  searchTerm,
  onSearchTermChange,
  statusFiltro,
  onStatusFiltroChange,
  onOpenCreateModal,
  onExportCsv,
  onImportCsvClick,
  onImportCsvFileChange,
  fileInputRef,
  importingCsv,
  onRefresh,
  loadingList,
}: PontoInstitucionalListToolbarProps) {
  return (
    <div className="company-list-toolbar">
      <input
        type="search"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        placeholder="Buscar por nome, tipo, endereço ou contato"
      />
      <select
        value={statusFiltro}
        onChange={(event) => onStatusFiltroChange(event.target.value as StatusFiltroPonto)}
      >
        <option value="ativos">Somente ativos</option>
        <option value="inativos">Somente inativos</option>
        <option value="todos">Todos</option>
      </select>
      <button type="button" className="btn-with-icon btn-action-new" onClick={onOpenCreateModal}>
        Novo Ponto
      </button>
      <button type="button" className="ghost btn-with-icon" onClick={() => onExportCsv(false)}>
        Exportar CSV
      </button>
      <button type="button" className="ghost btn-with-icon" onClick={() => onExportCsv(true)}>
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
      />
      <button
        type="button"
        className="ghost btn-with-icon btn-action-refresh"
        onClick={onRefresh}
        disabled={loadingList}
      >
        {loadingList ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );
}
