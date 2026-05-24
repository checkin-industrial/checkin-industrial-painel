import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUrl } from "../../shared/api/apiClient";
import { PontoInstitucionalFormModal } from "./components/PontoInstitucionalFormModal";
import { PontoInstitucionalListToolbar } from "./components/PontoInstitucionalListToolbar";
import { PontoInstitucionalTable } from "./components/PontoInstitucionalTable";
import {
  INITIAL_FORM_PONTO,
  parsePontoTipoValue,
  type PontoInstitucionalListItem,
  type PontoInstitucionalPayload,
  type StatusFiltroPonto,
  type UploadCategoria,
} from "./types";

const PONTOS_QUERY_KEY = "pontos-institucionais";

export function PontosInstitucionaisManagementScreen() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltroPonto>("ativos");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<PontoInstitucionalPayload>(INITIAL_FORM_PONTO);
  const [initialModalForm, setInitialModalForm] = useState<PontoInstitucionalPayload>(INITIAL_FORM_PONTO);
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
      const endpoint = editingId
        ? `/api/pontos-institucionais/${editingId}`
        : "/api/pontos-institucionais";
      const method = editingId ? "PUT" : "POST";

      await apiFetch(method, endpoint, { body: payload });

      setFormData(INITIAL_FORM_PONTO);
      setInitialModalForm(INITIAL_FORM_PONTO);
      setEditingId(null);
      setIsModalOpen(false);
      setSuccessMessage(
        editingId
          ? "Ponto institucional atualizado com sucesso."
          : "Ponto institucional cadastrado com sucesso.",
      );
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
      const data = await apiFetch<PontoInstitucionalListItem>(
        "GET",
        `/api/pontos-institucionais/${id}`,
      );

      setEditingId(id);
      const nextFormData: PontoInstitucionalPayload = {
        nome: data.nome ?? "",
        tipo: parsePontoTipoValue(data.tipo),
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
      setError(
        err instanceof Error ? err.message : "Erro ao preparar edição do ponto institucional.",
      );
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
    setFormData(INITIAL_FORM_PONTO);
    setInitialModalForm(INITIAL_FORM_PONTO);
    setIsModalOpen(false);
    setError(null);
    setSuccessMessage(null);
  }

  function handleOpenCreateModal() {
    setEditingId(null);
    setFormData(INITIAL_FORM_PONTO);
    setInitialModalForm(INITIAL_FORM_PONTO);
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
      setFormData((prev) =>
        categoria === "foto"
          ? { ...prev, responsavelFotoUrl: data.url }
          : categoria === "logo"
            ? { ...prev, logoUrl: data.url }
            : { ...prev, cardFotoUrl: data.url },
      );
      setSuccessMessage(
        categoria === "foto"
          ? "Foto enviada com sucesso."
          : categoria === "logo"
            ? "Logo enviado com sucesso."
            : "Imagem de card enviada com sucesso.",
      );
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
        setError(
          `${summary} Primeiro erro: linha ${first.lineNumber ?? "?"}, campo ${first.fieldName ?? "?"} - ${first.message ?? "erro desconhecido"}.`,
        );
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
      tipo: parsePontoTipoValue(item.tipo),
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

        <PontoInstitucionalListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFiltro={statusFiltro}
          onStatusFiltroChange={setStatusFiltro}
          onOpenCreateModal={handleOpenCreateModal}
          onExportCsv={handleExportCsv}
          onImportCsvClick={() => fileInputRef.current?.click()}
          onImportCsvFileChange={handleImportCsvFile}
          fileInputRef={fileInputRef}
          importingCsv={importingCsv}
          onRefresh={() => refetchPontos()}
          loadingList={loadingList}
        />

        {(error || queryErrorMessage) && <p className="status-error">{error || queryErrorMessage}</p>}
        {successMessage && <p className="status-info">{successMessage}</p>}

        <PontoInstitucionalTable
          pontos={filteredPontos}
          loadingList={loadingList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReactivate={handleReactivate}
        />
      </section>

      <PontoInstitucionalFormModal
        isOpen={isModalOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        uploadingFoto={uploadingFoto}
        uploadingLogo={uploadingLogo}
        uploadingCard={uploadingCard}
        onSubmit={handleSubmit}
        onClose={handleRequestCloseModal}
        onUploadImagem={handleUploadImagem}
      />
    </section>
  );
}
