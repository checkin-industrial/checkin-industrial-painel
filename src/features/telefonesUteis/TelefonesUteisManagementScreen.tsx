import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../shared/api/apiClient";

type TelefoneUtilListItem = {
  id: string;
  nome: string;
  categoria: string;
  telefone: string;
  ordemExibicao: number;
  ativo: boolean;
};

type TelefoneUtilPayload = {
  nome: string;
  categoria: number;
  telefone: string;
  ordemExibicao: number;
  ativo: boolean;
};

const CATEGORIA_OPTIONS = [
  { value: 1, label: "Emergencia e Servicos Publicos" },
  { value: 2, label: "Transporte e Cultura" },
  { value: 3, label: "Hoteis e Pousadas" },
];

const INITIAL_FORM: TelefoneUtilPayload = {
  nome: "",
  categoria: 1,
  telefone: "",
  ordemExibicao: 0,
  ativo: true,
};

function categoriaLabel(categoria: string) {
  const normalized = categoria.trim().toLowerCase();

  switch (normalized) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return "Emergencia e Servicos Publicos";
    case "transportecultura":
    case "transporte_cultura":
      return "Transporte e Cultura";
    case "hoteispousadas":
    case "hoteis_pousadas":
      return "Hoteis e Pousadas";
    default:
      return categoria;
  }
}

function categoriaBadgeClass(categoria: string) {
  const normalized = categoria.trim().toLowerCase();

  switch (normalized) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return "tipo-badge setor-prefeitura";
    case "transportecultura":
    case "transporte_cultura":
      return "tipo-badge comercio";
    case "hoteispousadas":
    case "hoteis_pousadas":
      return "tipo-badge hotel";
    default:
      return "tipo-badge";
  }
}

function categoriaIcon(categoria: string) {
  const normalized = categoria.trim().toLowerCase();

  switch (normalized) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return "SOC";
    case "transportecultura":
    case "transporte_cultura":
      return "MOV";
    case "hoteispousadas":
    case "hoteis_pousadas":
      return "HOT";
    default:
      return "TEL";
  }
}

function parseCategoriaValue(categoria: string) {
  const normalized = categoria.trim().toLowerCase();

  switch (normalized) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return 1;
    case "transportecultura":
    case "transporte_cultura":
      return 2;
    case "hoteispousadas":
    case "hoteis_pousadas":
      return 3;
    default:
      return 1;
  }
}

export function TelefonesUteisManagementScreen() {
  const [telefones, setTelefones] = useState<TelefoneUtilListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<TelefoneUtilPayload>(INITIAL_FORM);
  const [initialModalForm, setInitialModalForm] = useState<TelefoneUtilPayload>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isModalDirty = useMemo(() => {
    if (!isModalOpen) {
      return false;
    }

    return JSON.stringify(formData) !== JSON.stringify(initialModalForm);
  }, [formData, initialModalForm, isModalOpen]);

  async function loadTelefones(status: "ativos" | "inativos" | "todos" = statusFiltro) {
    setLoadingList(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status === "ativos") {
        params.set("ativo", "true");
      }

      if (status === "inativos") {
        params.set("ativo", "false");
      }

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/telefones-uteis?${queryString}`
        : "/api/telefones-uteis";

      const data = await apiFetch<TelefoneUtilListItem[]>("GET", endpoint);
      setTelefones(Array.isArray(data) ? data : []);
    } catch (err) {
      setTelefones([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar telefones úteis.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadTelefones(statusFiltro);
  }, [statusFiltro]);

  const filteredTelefones = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return telefones;
    }

    return telefones.filter((item) => {
      const haystack = [
        item.nome,
        item.categoria,
        item.telefone,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [telefones, searchTerm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: TelefoneUtilPayload = {
      ...formData,
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim(),
    };

    try {
      const endpoint = editingId ? `/api/telefones-uteis/${editingId}` : "/api/telefones-uteis";
      const method = editingId ? "PUT" : "POST";

      // apiFetch extrai message do body em respostas !ok (ApiError.message).
      await apiFetch(method, endpoint, { body: payload });

      setFormData(INITIAL_FORM);
      setInitialModalForm(INITIAL_FORM);
      setEditingId(null);
      setIsModalOpen(false);
      setSuccessMessage(editingId ? "Telefone útil atualizado com sucesso." : "Telefone útil cadastrado com sucesso.");
      await loadTelefones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar telefone útil.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(id: string) {
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiFetch<TelefoneUtilListItem>("GET", `/api/telefones-uteis/${id}`);
      setEditingId(id);
      const nextFormData: TelefoneUtilPayload = {
        nome: data.nome ?? "",
        categoria: parseCategoriaValue(data.categoria),
        telefone: data.telefone ?? "",
        ordemExibicao: Number(data.ordemExibicao) || 0,
        ativo: true,
      };
      setFormData(nextFormData);
      setInitialModalForm(nextFormData);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao preparar edição do telefone útil.");
    }
  }

  function handleRequestCloseModal() {
    if (isModalDirty) {
      const confirmed = window.confirm("Existem alterações não salvas. Deseja fechar mesmo assim?");
      if (!confirmed) {
        return;
      }
    }

    setEditingId(null);
    setFormData(INITIAL_FORM);
    setInitialModalForm(INITIAL_FORM);
    setIsModalOpen(false);
    setError(null);
    setSuccessMessage(null);
  }

  function handleOpenCreateModal() {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setInitialModalForm(INITIAL_FORM);
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    setError(null);
    setSuccessMessage(null);

    const confirmed = window.confirm("Deseja realmente desativar este telefone útil?");
    if (!confirmed) {
      return;
    }

    try {
      try {
        await apiFetch("DELETE", `/api/telefones-uteis/${id}`);
      } catch (err) {
        // 404 tolerado: registro ja desativado.
        if (!(err instanceof Error) || !err.message.includes("404")) {
          throw err;
        }
      }

      setSuccessMessage("Telefone útil desativado com sucesso.");
      await loadTelefones(statusFiltro);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir telefone útil.");
    }
  }

  async function handleReactivate(item: TelefoneUtilListItem) {
    setError(null);
    setSuccessMessage(null);

    const payload: TelefoneUtilPayload = {
      nome: item.nome,
      categoria: parseCategoriaValue(item.categoria),
      telefone: item.telefone,
      ordemExibicao: Number(item.ordemExibicao) || 0,
      ativo: true,
    };

    try {
      await apiFetch("PUT", `/api/telefones-uteis/${item.id}`, { body: payload });
      setSuccessMessage("Telefone útil reativado com sucesso.");
      await loadTelefones(statusFiltro);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reativar telefone útil.");
    }
  }

  return (
    <section className="management-layout management-layout--list-only">
      <section className="company-list-panel">
        <div className="panel-title-row">
          <h2>Telefones Úteis</h2>
          <span className="panel-hint">Total exibido: {filteredTelefones.length}</span>
        </div>

        <div className="company-list-toolbar">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, categoria ou telefone"
          />
          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value as "ativos" | "inativos" | "todos")}
          >
            <option value="ativos">Somente ativos</option>
            <option value="inativos">Somente inativos</option>
            <option value="todos">Todos</option>
          </select>
          <button type="button" className="btn-with-icon btn-action-new" onClick={handleOpenCreateModal}>
            Novo Telefone
          </button>
          <button type="button" className="ghost btn-with-icon btn-action-refresh" onClick={() => loadTelefones()} disabled={loadingList}>
            {loadingList ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {error && <p className="status-error">{error}</p>}
        {successMessage && <p className="status-info">{successMessage}</p>}

        <div className="table-wrapper">
          <table className="company-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Telefone</th>
                <th>Ordem</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTelefones.map((item) => (
                <tr key={item.id}>
                  <td data-label="Nome"><strong>{item.nome}</strong></td>
                  <td data-label="Categoria">
                    <span className={categoriaBadgeClass(item.categoria)}>
                      <span className="tipo-badge-icon" aria-hidden="true">{categoriaIcon(item.categoria)}</span>
                      {categoriaLabel(item.categoria)}
                    </span>
                  </td>
                  <td data-label="Telefone">{item.telefone}</td>
                  <td data-label="Ordem">{item.ordemExibicao}</td>
                  <td data-label="Status">{item.ativo ? "Ativo" : "Inativo"}</td>
                  <td data-label="Ações">
                    <div className="action-group">
                      <button type="button" className="warning btn-with-icon btn-action-edit" onClick={() => handleEdit(item.id)}>
                        Editar
                      </button>
                      {item.ativo
                        ? (
                          <button type="button" className="danger btn-with-icon btn-action-delete" onClick={() => handleDelete(item.id)}>
                            Desativar
                          </button>
                          )
                        : (
                          <button type="button" className="ghost btn-with-icon btn-action-reactivate" onClick={() => handleReactivate(item)}>
                            Reativar
                          </button>
                          )}
                    </div>
                  </td>
                </tr>
              ))}

              {loadingList && filteredTelefones.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-loading-cell">
                    <div className="map-loading-spinner" />
                    <div className="map-loading-label">Carregando telefones úteis...</div>
                  </td>
                </tr>
              )}

              {!loadingList && filteredTelefones.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">Nenhum telefone útil encontrado para o filtro informado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" onClick={handleRequestCloseModal}>
          <div className="app-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal-header">
              <h2>{editingId ? "Editar Telefone Útil" : "Novo Telefone Útil"}</h2>
              <button type="button" className="app-modal-close btn-with-icon btn-action-close" onClick={handleRequestCloseModal}>Fechar</button>
            </div>

            <form className="company-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Nome
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nome: event.target.value }))}
                    maxLength={180}
                    required
                  />
                </label>

                <label>
                  Categoria
                  <select
                    value={formData.categoria}
                    onChange={(event) => setFormData((prev) => ({ ...prev, categoria: Number(event.target.value) }))}
                  >
                    {CATEGORIA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Telefone
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, telefone: event.target.value }))}
                    maxLength={80}
                    placeholder="Ex.: (14) 3269-1300 / 99999-0000"
                    required
                  />
                </label>

                <label>
                  Ordem de exibição
                  <input
                    type="number"
                    min={0}
                    value={formData.ordemExibicao}
                    onChange={(event) => setFormData((prev) => ({ ...prev, ordemExibicao: Number(event.target.value) }))}
                    required
                  />
                </label>
              </div>

              <div className="company-form-actions">
                <button type="submit" className="btn-with-icon btn-action-save" disabled={submitting}>
                  {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Telefone"}
                </button>
                <button type="button" className="ghost btn-with-icon btn-action-cancel" onClick={handleRequestCloseModal} disabled={submitting}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
