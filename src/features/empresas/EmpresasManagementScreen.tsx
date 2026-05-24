import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";
import { STATUS } from "./empresaStatus";
import type {
  EmpresaCreatePayload,
  EmpresaDetalheResponseRaw,
  EmpresaListItem,
  GeocodeResponse,
  StatusFiltro,
} from "./types";
import { EmpresasListToolbar } from "./components/EmpresasListToolbar";
import { EmpresasTable } from "./components/EmpresasTable";
import { EmpresaFormModal, INITIAL_FORM } from "./components/EmpresaFormModal";

const EMPRESAS_QUERY_KEY = "empresas";

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

// Atalho admin do mapa publico: quando o usuario clica em "Editar cadastro"
// no popup, App.tsx muda tab pra "gestao" e passa o id da empresa via pendingEditId.
// Ao detectar a prop preenchida, abrimos automaticamente o modal de edicao
// e chamamos onEditConsumed pra zerar o estado pai (evita reabrir em re-renders).
type EmpresasManagementScreenProps = {
  pendingEditId?: string | null;
  onEditConsumed?: () => void;
};

export function EmpresasManagementScreen({ pendingEditId, onEditConsumed }: EmpresasManagementScreenProps = {}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("ativo");
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
    queryKey: [EMPRESAS_QUERY_KEY, "list", statusFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", statusFiltro);
      const url = `/api/empresas/filter?${params.toString()}`;
      const data = await apiFetch<EmpresaListItem[]>("GET", url);
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

  // Deep-link do mapa: ao detectar pendingEditId, abre o modal de edicao
  // pra aquela empresa e notifica o pai pra zerar o pendingEditId (evita
  // reabrir em cada re-render). Skip se modal ja esta aberto (defesa contra
  // race no fechamento manual).
  useEffect(() => {
    if (!pendingEditId || isModalOpen) {
      return;
    }
    handleEdit(pendingEditId);
    onEditConsumed?.();
    // handleEdit/onEditConsumed sao estaveis no escopo; eslint pediria adiciona-las
    // mas isso geraria loop (handleEdit muda formData -> re-render -> dispara de novo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEditId]);

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
        setor: data.setor ?? "industria",
        porte: data.porte ?? "me",
        numeroFuncionarios: Number(data.numeroFuncionarios) || 0,
        endereco: enderecoResposta,
        telefone: data.telefone ?? "",
        cep: data.cep ?? "",
        municipio: data.municipio ?? "",
        descricaoCnae: data.descricaoCnae ?? "",
        matrizOuFilial: data.matrizOuFilialCodigo ?? "matriz",
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        situacaoCadastral: data.situacaoCadastral ?? "ativa",
        status: data.status ?? STATUS.Ativo,
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

  async function handleReactivate(empresa: EmpresaListItem) {
    setError(null);
    setSuccessMessage(null);

    try {
      // Reativacao precisa do registro completo (PUT eh substitutivo na API).
      // Buscamos a empresa por id para nao perder campos nao listados em
      // EmpresaListItem (razaoSocial, cnpj, numeroFuncionarios, ...).
      const detalhe = await apiFetch<EmpresaDetalheResponseRaw>("GET", `/api/empresas/${empresa.id}`);
      const enderecoResposta = [
        detalhe.endereco,
        detalhe.Endereco,
        detalhe.logradouro,
        detalhe.Logradouro,
        detalhe.address,
        detalhe.Address,
      ].find((value) => typeof value === "string" && value.trim().length > 0) ?? "";

      const payload: EmpresaCreatePayload = {
        cnpj: detalhe.cnpj ?? "",
        razaoSocial: detalhe.razaoSocial ?? "",
        nomeFantasia: detalhe.nomeFantasia ?? "",
        cnaePrincipal: detalhe.cnaePrincipal ?? "",
        setor: detalhe.setor ?? "industria",
        porte: detalhe.porte ?? "me",
        numeroFuncionarios: Number(detalhe.numeroFuncionarios) || 0,
        endereco: enderecoResposta,
        telefone: detalhe.telefone ?? "",
        cep: detalhe.cep ?? "",
        municipio: detalhe.municipio ?? "",
        descricaoCnae: detalhe.descricaoCnae ?? "",
        matrizOuFilial: detalhe.matrizOuFilialCodigo ?? "matriz",
        latitude: Number(detalhe.latitude),
        longitude: Number(detalhe.longitude),
        situacaoCadastral: detalhe.situacaoCadastral ?? "ativa",
        status: STATUS.Ativo,
      };

      await apiFetch("PUT", `/api/empresas/${empresa.id}`, { body: payload });
      const verbo = empresa.status === STATUS.AguardandoRevisao ? "aprovada" : "reativada";
      setSuccessMessage(`Empresa "${empresa.nomeFantasia}" ${verbo} com sucesso.`);
      await invalidateEmpresas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar/reativar empresa.");
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

        <EmpresasListToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFiltro={statusFiltro}
          onStatusFiltroChange={setStatusFiltro}
          onOpenCreateModal={handleOpenCreateModal}
          onRefresh={() => refetchEmpresas()}
          loadingList={loadingList}
        />

        {(error || queryErrorMessage) && <p className="status-error">{error || queryErrorMessage}</p>}
        {successMessage && <p className="status-info">{successMessage}</p>}

        <EmpresasTable
          empresas={filteredEmpresas}
          loadingList={loadingList}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReactivate={handleReactivate}
        />
      </section>

      <EmpresaFormModal
        isOpen={isModalOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        geocoding={geocoding}
        onSubmit={handleSubmit}
        onClose={handleRequestCloseModal}
        onGeocode={handleGeocodeFromAddress}
      />
    </section>
  );
}
