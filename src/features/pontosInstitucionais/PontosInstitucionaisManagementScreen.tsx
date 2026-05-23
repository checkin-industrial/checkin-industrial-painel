import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PONTOS_QUERY_KEY = "pontos-institucionais";
import { apiFetch, apiUrl, staticUrl } from "../../shared/api/apiClient";

type PontoInstitucionalListItem = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  endereco: string;
  latitude: number;
  longitude: number;
  atividadesDisponiveis: string;
  equipeGestao: string;
  contatoNome: string;
  contatoTelefone: string;
  contatoEmail: string;
  responsavelFotoUrl?: string | null;
  logoUrl?: string | null;
  cardFotoUrl?: string | null;
  corMarcador: string;
  iconeMarcador: string;
  ordemExibicao: number;
  ativo: boolean;
};

type PontoInstitucionalPayload = {
  nome: string;
  tipo: number;
  descricao: string;
  endereco: string;
  latitude: number;
  longitude: number;
  atividadesDisponiveis: string;
  equipeGestao: string;
  contatoNome: string;
  contatoTelefone: string;
  contatoEmail: string;
  responsavelFotoUrl?: string;
  logoUrl?: string;
  cardFotoUrl?: string;
  corMarcador: string;
  iconeMarcador: string;
  ordemExibicao: number;
  ativo: boolean;
};

type UploadCategoria = "foto" | "logo" | "card";

const TIPO_OPTIONS = [
  { value: 1, label: "Educação" },
  { value: 2, label: "Comércio" },
  { value: 3, label: "Financeiro" },
  { value: 4, label: "Serviço" },
  { value: 5, label: "Setor Prefeitura" },
  { value: 6, label: "Ponto Turístico" },
  { value: 7, label: "Hotel / Hospedagem" },
  { value: 8, label: "Ecoturismo" },
];

const INITIAL_FORM: PontoInstitucionalPayload = {
  nome: "",
  tipo: 1,
  descricao: "",
  endereco: "",
  latitude: -22.6,
  longitude: -48.8,
  atividadesDisponiveis: "",
  equipeGestao: "",
  contatoNome: "",
  contatoTelefone: "",
  contatoEmail: "",
  responsavelFotoUrl: "",
  logoUrl: "",
  cardFotoUrl: "",
  corMarcador: "#0d9488",
  iconeMarcador: "institucional",
  ordemExibicao: 0,
  ativo: true,
};

function tipoLabel(tipo: string) {
  const normalized = tipo.trim().toLowerCase();

  switch (normalized) {
    case "educacao":
      return "Educação";
    case "comercio":
      return "Comércio";
    case "financeiro":
      return "Financeiro";
    case "servico":
      return "Serviço";
    case "setorprefeitura":
    case "setor_prefeitura":
      return "Setor Prefeitura";
    case "pontoturistico":
      return "Ponto Turístico";
    case "hotel":
      return "Hotel / Hospedagem";
    case "ecoturismo":
      return "Ecoturismo";
    default:
      return tipo;
  }
}

function tipoBadgeClass(tipo: string) {
  const normalized = tipo.trim().toLowerCase();

  switch (normalized) {
    case "educacao":
      return "tipo-badge educacao";
    case "comercio":
      return "tipo-badge comercio";
    case "financeiro":
      return "tipo-badge financeiro";
    case "servico":
      return "tipo-badge servico";
    case "setorprefeitura":
    case "setor_prefeitura":
      return "tipo-badge setor-prefeitura";
    case "pontoturistico":
      return "tipo-badge ponto-turistico";
    case "hotel":
      return "tipo-badge hotel";
    case "ecoturismo":
      return "tipo-badge ecoturismo";
    default:
      return "tipo-badge";
  }
}

function tipoIcon(tipo: string) {
  const normalized = tipo.trim().toLowerCase();

  switch (normalized) {
    case "educacao":
      return "EDU";
    case "comercio":
      return "COM";
    case "financeiro":
      return "FIN";
    case "servico":
      return "SRV";
    case "setorprefeitura":
    case "setor_prefeitura":
      return "GOV";
    default:
      return "TIP";
  }
}

function parseTipoValue(tipo: string) {
  const normalized = tipo.trim().toLowerCase();

  switch (normalized) {
    case "educacao":
      return 1;
    case "comercio":
      return 2;
    case "financeiro":
      return 3;
    case "servico":
      return 4;
    case "sedecom":
      return 5;
    case "senai":
      return 1;
    case "setorprefeitura":
    case "setor_prefeitura":
      return 5;
    case "pontoturistico":
    case "ponto_turistico":
      return 6;
    case "hotel":
      return 7;
    case "ecoturismo":
      return 8;
    default:
      return 4;
  }
}

export function PontosInstitucionaisManagementScreen() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PontoInstitucionalPayload>(INITIAL_FORM);
  const [initialModalForm, setInitialModalForm] = useState<PontoInstitucionalPayload>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isModalDirty = useMemo(() => {
    if (!isModalOpen) {
      return false;
    }

    return JSON.stringify(formData) !== JSON.stringify(initialModalForm);
  }, [formData, initialModalForm, isModalOpen]);

  const {
    data: pontos = [],
    isLoading: loadingList,
    error: queryError,
    refetch: refetchPontos,
  } = useQuery({
    queryKey: [PONTOS_QUERY_KEY, statusFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFiltro === "ativos") params.set("ativo", "true");
      if (statusFiltro === "inativos") params.set("ativo", "false");
      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/pontos-institucionais?${queryString}`
        : "/api/pontos-institucionais";
      const data = await apiFetch<PontoInstitucionalListItem[]>("GET", endpoint);
      return Array.isArray(data) ? data : [];
    },
  });

  const queryErrorMessage = queryError instanceof Error ? queryError.message : null;

  function invalidatePontos() {
    return queryClient.invalidateQueries({ queryKey: [PONTOS_QUERY_KEY] });
  }

  const filteredPontos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return pontos;
    }

    return pontos.filter((ponto) => {
      const haystack = [
        ponto.nome,
        ponto.tipo,
        ponto.descricao,
        ponto.endereco,
        ponto.contatoNome,
        ponto.contatoTelefone,
        ponto.contatoEmail,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [pontos, searchTerm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: PontoInstitucionalPayload = {
      ...formData,
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim(),
      endereco: formData.endereco.trim(),
      atividadesDisponiveis: formData.atividadesDisponiveis.trim(),
      equipeGestao: formData.equipeGestao.trim(),
      contatoNome: formData.contatoNome.trim(),
      contatoTelefone: formData.contatoTelefone.trim(),
      contatoEmail: formData.contatoEmail.trim(),
      responsavelFotoUrl: formData.responsavelFotoUrl?.trim() || undefined,
      logoUrl: formData.logoUrl?.trim() || undefined,
      cardFotoUrl: formData.cardFotoUrl?.trim() || undefined,
      corMarcador: formData.corMarcador.trim(),
      iconeMarcador: formData.iconeMarcador.trim(),
    };

    try {
      const endpoint = editingId ? `/api/pontos-institucionais/${editingId}` : "/api/pontos-institucionais";
      const method = editingId ? "PUT" : "POST";

      await apiFetch(method, endpoint, { body: payload });

      setFormData(INITIAL_FORM);
      setInitialModalForm(INITIAL_FORM);
      setEditingId(null);
      setIsModalOpen(false);
      setSuccessMessage(editingId ? "Ponto institucional atualizado com sucesso." : "Ponto institucional cadastrado com sucesso.");
      await invalidatePontos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar ponto institucional.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(id: string) {
    setError(null);
    setSuccessMessage(null);

    try {
      const responseData = await apiFetch<PontoInstitucionalListItem>(
        "GET",
        `/api/pontos-institucionais/${id}`,
      );

      const data = responseData;
      setEditingId(id);
      const nextFormData: PontoInstitucionalPayload = {
        nome: data.nome ?? "",
        tipo: parseTipoValue(data.tipo),
        descricao: data.descricao ?? "",
        endereco: data.endereco ?? "",
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        atividadesDisponiveis: data.atividadesDisponiveis ?? "",
        equipeGestao: data.equipeGestao ?? "",
        contatoNome: data.contatoNome ?? "",
        contatoTelefone: data.contatoTelefone ?? "",
        contatoEmail: data.contatoEmail ?? "",
        responsavelFotoUrl: data.responsavelFotoUrl ?? "",
        logoUrl: data.logoUrl ?? "",
        cardFotoUrl: data.cardFotoUrl ?? "",
        corMarcador: data.corMarcador ?? "#0d9488",
        iconeMarcador: data.iconeMarcador ?? "institucional",
        ordemExibicao: Number(data.ordemExibicao) || 0,
        ativo: true,
      };
      setFormData(nextFormData);
      setInitialModalForm(nextFormData);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao preparar edição do ponto institucional.");
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

  async function handleUploadImagem(event: ChangeEvent<HTMLInputElement>, categoria: UploadCategoria) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    if (categoria === "foto") {
      setUploadingFoto(true);
    } else if (categoria === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingCard(true);
    }

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("categoria", categoria);

      const data = await apiFetch<{ url: string }>(
        "POST",
        "/api/pontos-institucionais/upload-imagem",
        { body: form },
      );
      setFormData((prev) => (
        categoria === "foto"
          ? { ...prev, responsavelFotoUrl: data.url }
          : categoria === "logo"
            ? { ...prev, logoUrl: data.url }
            : { ...prev, cardFotoUrl: data.url }
      ));
      setSuccessMessage(
        categoria === "foto"
          ? "Foto enviada com sucesso."
          : categoria === "logo"
            ? "Logo enviado com sucesso."
            : "Imagem de card enviada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      event.target.value = "";
      if (categoria === "foto") {
        setUploadingFoto(false);
      } else if (categoria === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingCard(false);
      }
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleRequestCloseModal estavel via closure
  }, [isModalDirty, isModalOpen]);

  async function handleDelete(id: string) {
    setError(null);
    setSuccessMessage(null);

    const confirmed = window.confirm("Deseja realmente desativar este ponto institucional?");
    if (!confirmed) {
      return;
    }

    try {
      try {
        await apiFetch("DELETE", `/api/pontos-institucionais/${id}`);
      } catch (err) {
        // 404 tolerado: registro ja desativado.
        if (!(err instanceof Error) || !err.message.includes("404")) {
          throw err;
        }
      }

      setSuccessMessage("Ponto institucional desativado com sucesso.");
      await invalidatePontos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir ponto institucional.");
    }
  }

  async function handleExportCsv(ansi: boolean) {
    setError(null);
    setSuccessMessage(null);

    try {
      const endpoint = ansi
        ? "/api/import/pontos-institucionais/exportar-ansi"
        : "/api/import/pontos-institucionais/exportar";
      const response = await fetch(apiUrl(endpoint));

      if (!response.ok) {
        throw new Error(`Falha ao exportar CSV (${response.status})`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const fileName = fileNameMatch?.[1] ?? `pontos-institucionais-${ansi ? "ansi" : "utf8"}.csv`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setSuccessMessage("Exportacao de pontos institucionais concluida.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar pontos institucionais.");
    }
  }

  async function handleImportCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportingCsv(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const result = await apiFetch<{
        totalRecords?: number;
        inserted?: number;
        updated?: number;
        skipped?: number;
        errors?: Array<{ lineNumber?: number; fieldName?: string; message?: string }>;
      }>("POST", "/api/import/pontos-institucionais", { body: form });

      const total = result?.totalRecords ?? 0;
      const inserted = result?.inserted ?? 0;
      const updated = result?.updated ?? 0;
      const skipped = result?.skipped ?? 0;
      const errors = result?.errors ?? [];

      const summary = `Importacao concluida. Total: ${total}, Inseridos: ${inserted}, Atualizados: ${updated}, Ignorados: ${skipped}.`;
      if (errors.length > 0) {
        const first = errors[0];
        setError(`${summary} Primeiro erro: linha ${first.lineNumber ?? "?"}, campo ${first.fieldName ?? "?"} - ${first.message ?? "erro desconhecido"}.`);
      } else {
        setSuccessMessage(summary);
      }

      await invalidatePontos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar pontos institucionais.");
    } finally {
      event.target.value = "";
      setImportingCsv(false);
    }
  }

  async function handleReactivate(item: PontoInstitucionalListItem) {
    setError(null);
    setSuccessMessage(null);

    const payload: PontoInstitucionalPayload = {
      nome: item.nome,
      tipo: parseTipoValue(item.tipo),
      descricao: item.descricao,
      endereco: item.endereco,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      atividadesDisponiveis: item.atividadesDisponiveis,
      equipeGestao: item.equipeGestao,
      contatoNome: item.contatoNome,
      contatoTelefone: item.contatoTelefone,
      contatoEmail: item.contatoEmail,
      responsavelFotoUrl: item.responsavelFotoUrl ?? "",
      logoUrl: item.logoUrl ?? "",
      cardFotoUrl: item.cardFotoUrl ?? "",
      corMarcador: item.corMarcador,
      iconeMarcador: item.iconeMarcador,
      ordemExibicao: Number(item.ordemExibicao) || 0,
      ativo: true,
    };

    try {
      await apiFetch("PUT", `/api/pontos-institucionais/${item.id}`, { body: payload });
      setSuccessMessage("Ponto institucional reativado com sucesso.");
      await invalidatePontos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reativar ponto institucional.");
    }
  }

  return (
    <section className="management-layout management-layout--list-only">
      <section className="company-list-panel">
        <div className="panel-title-row">
          <h2>Pontos Institucionais</h2>
          <span className="panel-hint">Total exibido: {filteredPontos.length}</span>
        </div>

        <div className="company-list-toolbar">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, tipo, endereço ou contato"
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
            Novo Ponto
          </button>
          <button type="button" className="ghost btn-with-icon" onClick={() => handleExportCsv(false)}>
            Exportar CSV
          </button>
          <button type="button" className="ghost btn-with-icon" onClick={() => handleExportCsv(true)}>
            Exportar CSV ANSI
          </button>
          <button
            type="button"
            className="ghost btn-with-icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={importingCsv}
          >
            {importingCsv ? "Importando..." : "Importar CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportCsvFile}
            style={{ display: "none" }}
          />
          <button type="button" className="ghost btn-with-icon btn-action-refresh" onClick={() => refetchPontos()} disabled={loadingList}>
            {loadingList ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {(error || queryErrorMessage) && <p className="status-error">{error || queryErrorMessage}</p>}
        {successMessage && <p className="status-info">{successMessage}</p>}

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
              {filteredPontos.map((ponto) => (
                <tr key={ponto.id}>
                  <td data-label="Nome">
                    <strong>{ponto.nome}</strong>
                    <small>{ponto.descricao}</small>
                  </td>
                  <td data-label="Tipo">
                    <span className={tipoBadgeClass(ponto.tipo)}>
                      <span className="tipo-badge-icon" aria-hidden="true">{tipoIcon(ponto.tipo)}</span>
                      {tipoLabel(ponto.tipo)}
                    </span>
                  </td>
                  <td data-label="Endereço">{ponto.endereco}</td>
                  <td data-label="Contato">
                    <span>{ponto.contatoNome || "-"}</span>
                    <small>{ponto.contatoTelefone || "-"} | {ponto.contatoEmail || "-"}</small>
                  </td>
                  <td data-label="Ordem">{ponto.ordemExibicao}</td>
                  <td data-label="Status">{ponto.ativo ? "Ativo" : "Inativo"}</td>
                  <td data-label="Ações">
                    <div className="action-group">
                      <button type="button" className="warning btn-with-icon btn-action-edit" onClick={() => handleEdit(ponto.id)}>
                        Editar
                      </button>
                      {ponto.ativo
                        ? (
                          <button type="button" className="danger btn-with-icon btn-action-delete" onClick={() => handleDelete(ponto.id)}>
                            Desativar
                          </button>
                          )
                        : (
                          <button type="button" className="ghost btn-with-icon btn-action-reactivate" onClick={() => handleReactivate(ponto)}>
                            Reativar
                          </button>
                          )}
                    </div>
                  </td>
                </tr>
              ))}

              {loadingList && filteredPontos.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-loading-cell">
                    <div className="map-loading-spinner" />
                    <div className="map-loading-label">Carregando pontos institucionais...</div>
                  </td>
                </tr>
              )}

              {!loadingList && filteredPontos.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">Nenhum ponto institucional encontrado para o filtro informado.</td>
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
              <h2>{editingId ? "Editar Ponto Institucional" : "Novo Ponto Institucional"}</h2>
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
                  Tipo
                  <select
                    value={formData.tipo}
                    onChange={(event) => setFormData((prev) => ({ ...prev, tipo: Number(event.target.value) }))}
                  >
                    {TIPO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Cor do marcador
                  <div className="color-field-group">
                    <input
                      type="color"
                      value={formData.corMarcador}
                      onChange={(event) => setFormData((prev) => ({ ...prev, corMarcador: event.target.value }))}
                    />
                    <input
                      type="text"
                      value={formData.corMarcador}
                      onChange={(event) => setFormData((prev) => ({ ...prev, corMarcador: event.target.value }))}
                      maxLength={20}
                      required
                    />
                  </div>
                </label>

                <label>
                  Ícone do marcador
                  <input
                    type="text"
                    value={formData.iconeMarcador}
                    onChange={(event) => setFormData((prev) => ({ ...prev, iconeMarcador: event.target.value }))}
                    maxLength={60}
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

                <label>
                  Contato nome
                  <input
                    type="text"
                    value={formData.contatoNome}
                    onChange={(event) => setFormData((prev) => ({ ...prev, contatoNome: event.target.value }))}
                    maxLength={180}
                    required
                  />
                </label>

                <label>
                  Contato telefone
                  <input
                    type="text"
                    value={formData.contatoTelefone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, contatoTelefone: event.target.value }))}
                    maxLength={20}
                    required
                  />
                </label>

                <label>
                  Contato email
                  <input
                    type="email"
                    value={formData.contatoEmail}
                    onChange={(event) => setFormData((prev) => ({ ...prev, contatoEmail: event.target.value }))}
                    maxLength={150}
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
                Descrição
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(event) => setFormData((prev) => ({ ...prev, descricao: event.target.value }))}
                  maxLength={400}
                  required
                />
              </label>

              <label>
                Atividades disponíveis
                <input
                  type="text"
                  value={formData.atividadesDisponiveis}
                  onChange={(event) => setFormData((prev) => ({ ...prev, atividadesDisponiveis: event.target.value }))}
                  maxLength={300}
                  required
                />
              </label>

              <label>
                Equipe de gestão
                <input
                  type="text"
                  value={formData.equipeGestao}
                  onChange={(event) => setFormData((prev) => ({ ...prev, equipeGestao: event.target.value }))}
                  maxLength={250}
                  required
                />
              </label>

              <label>
                Foto do responsável (URL)
                <input
                  type="text"
                  value={formData.responsavelFotoUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, responsavelFotoUrl: event.target.value }))}
                  maxLength={500}
                  placeholder="https://... ou /uploads/..."
                />
              </label>

              <label>
                Upload da foto do responsável
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => handleUploadImagem(event, "foto")}
                  disabled={uploadingFoto || submitting}
                />
                {uploadingFoto && <small>Enviando foto...</small>}
              </label>

              {formData.responsavelFotoUrl && (
                <div className="upload-preview">
                  <span>Pré-visualização da foto do responsável</span>
                  <img src={staticUrl(formData.responsavelFotoUrl)} alt="Foto do responsável" loading="lazy" />
                </div>
              )}

              <label>
                Logo do ponto (URL)
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, logoUrl: event.target.value }))}
                  maxLength={500}
                  placeholder="https://... ou /uploads/..."
                />
              </label>

              <label>
                Upload do logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => handleUploadImagem(event, "logo")}
                  disabled={uploadingLogo || submitting}
                />
                {uploadingLogo && <small>Enviando logo...</small>}
              </label>

              {formData.logoUrl && (
                <div className="upload-preview upload-preview--logo">
                  <span>Pré-visualização do logo</span>
                  <img src={staticUrl(formData.logoUrl)} alt="Logo do ponto" loading="lazy" />
                </div>
              )}

              <label>
                Foto principal do card (URL)
                <input
                  type="text"
                  value={formData.cardFotoUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, cardFotoUrl: event.target.value }))}
                  maxLength={500}
                  placeholder="https://... ou /uploads/..."
                />
              </label>

              <label>
                Upload da foto principal do card
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => handleUploadImagem(event, "card")}
                  disabled={uploadingCard || submitting}
                />
                {uploadingCard && <small>Enviando imagem de card...</small>}
              </label>

              {formData.cardFotoUrl && (
                <div className="upload-preview upload-preview--cover">
                  <span>Pré-visualização da imagem do card</span>
                  <img src={staticUrl(formData.cardFotoUrl)} alt="Foto principal do card" loading="lazy" />
                </div>
              )}

              <div className="company-form-actions">
                <button type="submit" className="btn-with-icon btn-action-save" disabled={submitting}>
                  {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Ponto"}
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
