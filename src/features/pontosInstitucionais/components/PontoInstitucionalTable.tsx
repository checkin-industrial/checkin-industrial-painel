import {
  getPontoInstitucionalTipoBadgeClass,
  getPontoInstitucionalTipoIcon,
  getPontoInstitucionalTipoLabel,
} from "../markerHelpers";
import type { PontoInstitucionalListItem } from "../types";

type PontoInstitucionalTableProps = {
  pontos: PontoInstitucionalListItem[];
  loadingList: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReactivate: (item: PontoInstitucionalListItem) => void;
};

// Tabela admin de pontos institucionais. Acoes condicionais por status (Ativo
// -> Desativar; Inativo -> Reativar). Labels/badges/icons reusam helpers ja
// existentes em markerHelpers (consistencia com o mapa).
export function PontoInstitucionalTable({
  pontos,
  loadingList,
  onEdit,
  onDelete,
  onReactivate,
}: PontoInstitucionalTableProps) {
  return (
    <div className="table-wrapper">
      <table className="company-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Endereço</th>
            <th>Contato</th>
            <th>Ordem</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((ponto) => (
            <tr key={ponto.id}>
              <td data-label="Nome">
                <strong>{ponto.nome}</strong>
                <small>{ponto.descricao}</small>
              </td>
              <td data-label="Tipo">
                <span className={getPontoInstitucionalTipoBadgeClass(ponto.tipo)}>
                  <span className="tipo-badge-icon" aria-hidden="true">
                    {getPontoInstitucionalTipoIcon(ponto.tipo)}
                  </span>
                  {getPontoInstitucionalTipoLabel(ponto.tipo)}
                </span>
              </td>
              <td data-label="Endereço">{ponto.endereco}</td>
              <td data-label="Contato">
                <span>{ponto.contatoNome || "-"}</span>
                <small>
                  {ponto.contatoTelefone || "-"} | {ponto.contatoEmail || "-"}
                </small>
              </td>
              <td data-label="Ordem">{ponto.ordemExibicao}</td>
              <td data-label="Status">{ponto.ativo ? "Ativo" : "Inativo"}</td>
              <td data-label="Ações">
                <div className="action-group">
                  <button
                    type="button"
                    className="warning btn-with-icon btn-action-edit"
                    onClick={() => onEdit(ponto.id)}
                  >
                    Editar
                  </button>
                  {ponto.ativo ? (
                    <button
                      type="button"
                      className="danger btn-with-icon btn-action-delete"
                      onClick={() => onDelete(ponto.id)}
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ghost btn-with-icon btn-action-reactivate"
                      onClick={() => onReactivate(ponto)}
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {loadingList && pontos.length === 0 && (
            <tr>
              <td colSpan={7} className="table-loading-cell">
                <div className="map-loading-spinner" />
                <div className="map-loading-label">Carregando pontos institucionais...</div>
              </td>
            </tr>
          )}

          {!loadingList && pontos.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-state">
                Nenhum ponto institucional encontrado para o filtro informado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
