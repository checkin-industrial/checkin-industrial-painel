import { STATUS, statusBadgeClass, statusLabel } from "../empresaStatus";
import type { EmpresaListItem } from "../types";

type EmpresasTableProps = {
  empresas: EmpresaListItem[];
  loadingList: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReactivate: (empresa: EmpresaListItem) => void;
};

// Tabela admin da Gestao Empresas. Responsavel apenas pela renderizacao
// (linhas + acoes condicionais por status). Estado (filtro/busca) + handlers
// vivem no container.
//
// Acoes por status:
// - Ativo: Editar + Excluir
// - Inativo: Editar + Reativar
// - AguardandoRevisao: Editar + Aprovar (reativar) + Rejeitar (deletar)
export function EmpresasTable({
  empresas,
  loadingList,
  onEdit,
  onDelete,
  onReactivate,
}: EmpresasTableProps) {
  return (
    <div className="table-wrapper">
      <table className="company-table">
        <thead>
          <tr>
            <th>Nome Fantasia</th>
            <th>Setor</th>
            <th>Porte</th>
            <th>CNAE</th>
            <th>Município</th>
            <th>Contato</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((empresa) => (
            <tr key={empresa.id}>
              <td data-label="Nome Fantasia">
                <strong>{empresa.nomeFantasia}</strong>
                <small>{empresa.matrizOuFilial}</small>
              </td>
              <td data-label="Setor">{empresa.setor}</td>
              <td data-label="Porte">{empresa.porte}</td>
              <td data-label="CNAE">
                <span>{empresa.cnaePrincipal}</span>
                <small>{empresa.descricaoCnae}</small>
              </td>
              <td data-label="Município">{empresa.municipio}</td>
              <td data-label="Contato">
                <span>{empresa.telefone || "-"}</span>
                <small>CEP: {empresa.cep || "-"}</small>
              </td>
              <td data-label="Status">
                <span className={statusBadgeClass(empresa.status)}>{statusLabel(empresa.status)}</span>
              </td>
              <td data-label="Ações">
                <div className="action-group">
                  <button
                    type="button"
                    className="warning btn-with-icon btn-action-edit"
                    onClick={() => onEdit(empresa.id)}
                  >
                    Editar
                  </button>
                  {empresa.status === STATUS.Ativo && (
                    <button
                      type="button"
                      className="danger btn-with-icon btn-action-delete"
                      onClick={() => onDelete(empresa.id)}
                    >
                      Excluir
                    </button>
                  )}
                  {empresa.status === STATUS.Inativo && (
                    <button
                      type="button"
                      className="ghost btn-with-icon btn-action-reactivate"
                      onClick={() => onReactivate(empresa)}
                    >
                      Reativar
                    </button>
                  )}
                  {empresa.status === STATUS.AguardandoRevisao && (
                    <>
                      <button
                        type="button"
                        className="ghost btn-with-icon btn-action-reactivate"
                        onClick={() => onReactivate(empresa)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="danger btn-with-icon btn-action-delete"
                        onClick={() => onDelete(empresa.id)}
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {loadingList && empresas.length === 0 && (
            <tr>
              <td colSpan={8} className="table-loading-cell">
                <div className="map-loading-spinner" />
                <div className="map-loading-label">Carregando empresas...</div>
              </td>
            </tr>
          )}

          {!loadingList && empresas.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-state">
                Nenhuma empresa encontrada para o filtro informado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
