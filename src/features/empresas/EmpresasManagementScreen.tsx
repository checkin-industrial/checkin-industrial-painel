import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const EMPRESAS_QUERY_KEY = "empresas";
import { apiFetch } from "../../shared/api/apiClient";

type EmpresaListItem = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  setor: string;
  porte: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilial: string;
  latitude: number;
  longitude: number;
};

type EmpresaCreatePayload = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  setor: number;
  porte: number;
  numeroFuncionarios: number;
  endereco: string;
  telefone: string;
  cep: string;
  municipio: string;
  descricaoCnae: string;
  matrizOuFilial: number;
  latitude: number;
  longitude: number;
  situacaoCadastral: number;
};

type EmpresaDetalheResponse = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  setor: number;
  porte: number;
  numeroFuncionarios: number;
  endereco: string;
  Endereco?: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilialCodigo?: number;
  latitude: number;
  longitude: number;
  situacaoCadastral: number;
};

type EmpresaDetalheResponseRaw = EmpresaDetalheResponse & {
  endereco?: string;
  Endereco?: string;
  logradouro?: string;
  Logradouro?: string;
  address?: string;
  Address?: string;
};

type GeocodeResponse = {
  latitude: number;
  longitude: number;
  accuracy?: string;
  provider?: string;
};

const SETOR_OPTIONS = [
  { value: 1, label: "Industria" },
  { value: 2, label: "Comercio" },
  { value: 3, label: "Servicos" },
];

const PORTE_OPTIONS = [
  { value: 1, label: "MEI" },
  { value: 2, label: "ME" },
  { value: 3, label: "EPP" },
  { value: 4, label: "LTDA" },
  { value: 5, label: "S/A" },
];

const MATRIZ_FILIAL_OPTIONS = [
  { value: 1, label: "Matriz" },
  { value: 2, label: "Filial" },
];

const SITUACAO_OPTIONS = [
  { value: 1, label: "Ativa" },
  { value: 2, label: "Inativa" },
  { value: 3, label: "Suspensa" },
  { value: 4, label: "Baixada" },
];

const INITIAL_FORM: EmpresaCreatePayload = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  cnaePrincipal: "",
  setor: 1,
  porte: 2,
  numeroFuncionarios: 0,
  endereco: "",
  telefone: "",
  cep: "",
  municipio: "",
  descricaoCnae: "",
  matrizOuFilial: 1,
  latitude: -22.6,
  longitude: -48.8,
  situacaoCadastral: 1,
};

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function EmpresasManagementScreen() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmpresaCreatePayload>(INITIAL_FORM);
  const [initialModalForm, setInitialModalForm] = useState<EmpresaCreatePayload>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const isModalDirty = useMemo(() => {
    if (!isModalOpen) {
      return false;
    }

    return JSON.stringify(formData) !== JSON.stringify(initialModalForm);
  }, [formData, initialModalForm, isModalOpen]);

  const {
    data: empresas = [],
    isLoading: loadingList,
    error: queryError,
    refetch: refetchEmpresas,
  } = useQuery({
    queryKey: [EMPRESAS_QUERY_KEY, "list"],
    queryFn: async () => {
      const data = await apiFetch<EmpresaListItem[]>("GET", "/api/empresas/filter");
      return Array.isArray(data) ? data : [];
    },
  });

  const queryErrorMessage = queryError instanceof Error ? queryError.message : null;

  function invalidateEmpresas() {
    return queryClient.invalidateQueries({ queryKey: [EMPRESAS_QUERY_KEY] });
  }

  const filteredEmpresas = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return empresas;
    }

    return empresas.filter((empresa) => {
      const haystack = [
        empresa.nomeFantasia,
        empresa.cnaePrincipal,
        empresa.descricaoCnae,
        empresa.municipio,
        empresa.telefone,
        empresa.cep,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [empresas, searchTerm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: EmpresaCreatePayload = {
      ...formData,
      cnpj: sanitizeDigits(formData.cnpj),
      cnaePrincipal: sanitizeDigits(formData.cnaePrincipal),
      cep: sanitizeDigits(formData.cep),
      telefone: formData.telefone.trim(),
      razaoSocial: formData.razaoSocial.trim(),
      nomeFantasia: formData.nomeFantasia.trim(),
      municipio: formData.municipio.trim(),
      descricaoCnae: formData.descricaoCnae.trim(),
      endereco: formData.endereco.trim(),
    };

    try {
      const endpoint = editingId ? `/api/empresas/${editingId}` : "/api/empresas";
      const method = editingId ? "PUT" : "POST";

      // apiFetch ja extrai message do body em respostas !ok (ApiError.message).
      await apiFetch(method, endpoint, { body: payload });

      setFormData(INITIAL_FORM);
      setInitialModalForm(INITIAL_FORM);
      setEditingId(null);
      setIsModalOpen(false);
      setSuccessMessage(editingId ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso.");
      await invalidateEmpresas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(id: string) {
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiFetch<EmpresaDetalheResponseRaw>("GET", `/api/empresas/${id}`);
      const enderecoResposta = [
        data.endereco,
        data.Endereco,
        data.logradouro,
        data.Logradouro,
        data.address,
        data.Address,
      ].find((value) => typeof value === "string" && value.trim().length > 0) ?? "";

      setEditingId(id);
      const nextFormData: EmpresaCreatePayload = {
        cnpj: data.cnpj ?? "",
        razaoSocial: data.razaoSocial ?? "",
        nomeFantasia: data.nomeFantasia ?? "",
        cnaePrincipal: data.cnaePrincipal ?? "",
        setor: Number(data.setor) || 1,
        porte: Number(data.porte) || 2,
        numeroFuncionarios: Number(data.numeroFuncionarios) || 0,
        endereco: enderecoResposta,
        telefone: data.telefone ?? "",
        cep: data.cep ?? "",
        municipio: data.municipio ?? "",
        descricaoCnae: data.descricaoCnae ?? "",
        matrizOuFilial: Number(data.matrizOuFilialCodigo) || 1,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        situacaoCadastral: Number(data.situacaoCadastral) || 1,
      };
      setFormData(nextFormData);
      setInitialModalForm(nextFormData);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao preparar edição da empresa.");
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

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleRequestCloseModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // handleRequestCloseModal eh estavel via closure (depende so de isModalDirty/isModalOpen
    // que ja estao listados). React Hook lint pede pra listar mas geraria re-adds desnecessarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalDirty, isModalOpen]);

  async function handleDelete(id: string) {
    setError(null);
    setSuccessMessage(null);

    const confirmed = window.confirm("Deseja realmente excluir esta empresa?");
    if (!confirmed) {
      return;
    }

    try {
      try {
        await apiFetch("DELETE", `/api/empresas/${id}`);
      } catch (err) {
        // 404 e tolerado: o registro ja nao existe.
        if (!(err instanceof Error) || !err.message.includes("404")) {
          throw err;
        }
      }

      setSuccessMessage("Empresa excluída com sucesso.");
      await invalidateEmpresas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir empresa.");
    }
  }

  async function handleGeocodeFromAddress() {
    const endereco = formData.endereco.trim();
    if (!endereco) {
      setError("Informe um endereço para atualizar a geolocalização.");
      return;
    }

    setGeocoding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiFetch<GeocodeResponse>("POST", "/api/empresas/geocode", {
        body: {
          endereco,
          municipio: formData.municipio.trim() || null,
          estado: "SP",
        },
      });
      setFormData((prev) => ({
        ...prev,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      }));

      const provider = data.provider ? ` via ${data.provider}` : "";
      setSuccessMessage(`Geolocalização atualizada com sucesso${provider}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao geocodificar endereço.");
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <section className="management-layout management-layout--list-only">
      <section className="company-list-panel">
        <div className="panel-title-row">
          <h2>Empresas Cadastradas</h2>
          <span className="panel-hint">Total exibido: {filteredEmpresas.length}</span>
        </div>

        <div className="company-list-toolbar">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, CNAE, município, telefone ou CEP"
          />
          <button type="button" className="btn-with-icon btn-action-new" onClick={handleOpenCreateModal}>
            Nova Empresa
          </button>
          <button type="button" className="ghost btn-with-icon btn-action-refresh" onClick={() => refetchEmpresas()} disabled={loadingList}>
            {loadingList ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {(error || queryErrorMessage) && <p className="status-error">{error || queryErrorMessage}</p>}
        {successMessage && <p className="status-info">{successMessage}</p>}

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
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmpresas.map((empresa) => (
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
                  <td data-label="Ações">
                    <div className="action-group">
                      <button type="button" className="warning btn-with-icon btn-action-edit" onClick={() => handleEdit(empresa.id)}>
                        Editar
                      </button>
                      <button type="button" className="danger btn-with-icon btn-action-delete" onClick={() => handleDelete(empresa.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {loadingList && filteredEmpresas.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-loading-cell">
                    <div className="map-loading-spinner" />
                    <div className="map-loading-label">Carregando empresas...</div>
                  </td>
                </tr>
              )}

              {!loadingList && filteredEmpresas.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">Nenhuma empresa encontrada para o filtro informado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" onClick={handleRequestCloseModal}>
          <div className="app-modal-card app-modal-card--wide" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal-header">
              <h2>{editingId ? "Editar Empresa" : "Nova Empresa"}</h2>
              <button type="button" className="app-modal-close btn-with-icon btn-action-close" onClick={handleRequestCloseModal}>Fechar</button>
            </div>

            <form className="company-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  CNPJ
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(event) => setFormData((prev) => ({ ...prev, cnpj: event.target.value }))}
                    maxLength={18}
                    placeholder="Somente números"
                    required
                  />
                </label>

                <label>
                  Razão Social
                  <input
                    type="text"
                    value={formData.razaoSocial}
                    onChange={(event) => setFormData((prev) => ({ ...prev, razaoSocial: event.target.value }))}
                    maxLength={200}
                    required
                  />
                </label>

                <label>
                  Nome Fantasia
                  <input
                    type="text"
                    value={formData.nomeFantasia}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nomeFantasia: event.target.value }))}
                    maxLength={200}
                    required
                  />
                </label>

                <label>
                  CNAE Principal
                  <input
                    type="text"
                    value={formData.cnaePrincipal}
                    onChange={(event) => setFormData((prev) => ({ ...prev, cnaePrincipal: event.target.value }))}
                    maxLength={12}
                    placeholder="7 dígitos"
                    required
                  />
                </label>

                <label>
                  Setor
                  <select
                    value={formData.setor}
                    onChange={(event) => setFormData((prev) => ({ ...prev, setor: Number(event.target.value) }))}
                  >
                    {SETOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Porte
                  <select
                    value={formData.porte}
                    onChange={(event) => setFormData((prev) => ({ ...prev, porte: Number(event.target.value) }))}
                  >
                    {PORTE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Funcionários
                  <input
                    type="number"
                    min={0}
                    value={formData.numeroFuncionarios}
                    onChange={(event) => setFormData((prev) => ({ ...prev, numeroFuncionarios: Number(event.target.value) }))}
                    required
                  />
                </label>

                <label>
                  Telefone
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, telefone: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  CEP
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(event) => setFormData((prev) => ({ ...prev, cep: event.target.value }))}
                    maxLength={9}
                    placeholder="8 dígitos"
                    required
                  />
                </label>

                <label>
                  Município
                  <input
                    type="text"
                    value={formData.municipio}
                    onChange={(event) => setFormData((prev) => ({ ...prev, municipio: event.target.value }))}
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  Matriz/Filial
                  <select
                    value={formData.matrizOuFilial}
                    onChange={(event) => setFormData((prev) => ({ ...prev, matrizOuFilial: Number(event.target.value) }))}
                  >
                    {MATRIZ_FILIAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Situação
                  <select
                    value={formData.situacaoCadastral}
                    onChange={(event) => setFormData((prev) => ({ ...prev, situacaoCadastral: Number(event.target.value) }))}
                  >
                    {SITUACAO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Latitude
                  <input
                    type="number"
                    step="0.000001"
                    min={-90}
                    max={90}
                    value={formData.latitude}
                    onChange={(event) => setFormData((prev) => ({ ...prev, latitude: Number(event.target.value) }))}
                    required
                  />
                </label>

                <label>
                  Longitude
                  <input
                    type="number"
                    step="0.000001"
                    min={-180}
                    max={180}
                    value={formData.longitude}
                    onChange={(event) => setFormData((prev) => ({ ...prev, longitude: Number(event.target.value) }))}
                    required
                  />
                </label>
              </div>

              <label>
                Endereço
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(event) => setFormData((prev) => ({ ...prev, endereco: event.target.value }))}
                  maxLength={300}
                  required
                />
              </label>

              <label>
                Descrição CNAE
                <input
                  type="text"
                  value={formData.descricaoCnae}
                  onChange={(event) => setFormData((prev) => ({ ...prev, descricaoCnae: event.target.value }))}
                  maxLength={300}
                  required
                />
              </label>

              <div className="company-form-actions">
                <button
                  type="button"
                  className="ghost btn-with-icon btn-action-geocode"
                  onClick={handleGeocodeFromAddress}
                  disabled={submitting || geocoding || !formData.endereco.trim()}
                >
                  {geocoding ? "Geocodificando..." : "Atualizar Geolocalização"}
                </button>
                <button type="submit" className="btn-with-icon btn-action-save" disabled={submitting}>
                  {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Empresa"}
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