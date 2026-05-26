import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";
import type { ImportCandidate, StatusFiltroTriagem, CandidateDestino } from "./types";
import { PromoteToEmpresaModal } from "./components/PromoteToEmpresaModal";
import { PromoteToPontoModal } from "./components/PromoteToPontoModal";
import { PromoteToTelefoneModal } from "./components/PromoteToTelefoneModal";

const CANDIDATES_QUERY_KEY = "import-candidates";

// Tela admin de triagem: lista candidates do Google Maps Import e permite
// promover individualmente cada um pra Empresa/Ponto/Telefone (ou rejeitar
// por destino). Cada candidato tem 3 estados independentes — admin escolhe
// o que faz sentido por linha.
export function TriagemImportacoesScreen() {
  const queryClient = useQueryClient();
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltroTriagem>("pendente");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado dos modals: id do candidato selecionado pra cada destino.
  const [promotingEmpresaCandidate, setPromotingEmpresaCandidate] = useState<ImportCandidate | null>(null);
  const [promotingPontoCandidate, setPromotingPontoCandidate] = useState<ImportCandidate | null>(null);
  const [promotingTelefoneCandidate, setPromotingTelefoneCandidate] = useState<ImportCandidate | null>(null);

  const {
    data: candidates = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [CANDIDATES_QUERY_KEY, statusFiltro],
    queryFn: async () => {
      // statusFiltro=todos -> nao manda status na URL (backend retorna tudo)
      const params = statusFiltro === "todos" ? "" : `?status=${statusFiltro}`;
      const data = await apiFetch<ImportCandidate[]>("GET", `/api/import/candidates${params}`);
      return Array.isArray(data) ? data : [];
    },
  });

  const queryErrorMessage = queryError instanceof Error ? queryError.message : null;

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: [CANDIDATES_QUERY_KEY] });
  }

  async function handleReject(candidate: ImportCandidate, destino: CandidateDestino) {
    const destinoLabel = destino === "empresa" ? "Empresa" : destino === "ponto" ? "Ponto Institucional" : "Telefone Útil";
    const confirmed = window.confirm(
      `Rejeitar "${candidate.nome}" para ${destinoLabel}?\n\nA decisão é terminal — para reverter, exclua a entidade-fim depois.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch("POST", `/api/import/candidates/${candidate.id}/reject?destino=${destino}`);
      setSuccessMessage(`"${candidate.nome}" rejeitado para ${destinoLabel}.`);
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao rejeitar candidato.");
    }
  }

  function handlePromoteSuccess(message: string) {
    setError(null);
    setSuccessMessage(message);
    invalidate();
  }

  function handlePromoteError(message: string) {
    setError(message);
    setSuccessMessage(null);
  }

  const totalPorFiltro = useMemo(() => candidates.length, [candidates]);

  return (
    <section className="management-layout management-layout--list-only">
      <section className="company-list-panel">
        <div className="panel-title-row">
          <h2>Triagem de Importações Google Maps</h2>
          <span className="panel-hint">Total exibido: {totalPorFiltro}</span>
        </div>

        <div className="company-list-toolbar">
          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value as StatusFiltroTriagem)}
            aria-label="Filtro de status da triagem"
          >
            <option value="pendente">Com pendência (algum destino pendente)</option>
            <option value="aprovado">Com aprovação (algum destino aprovado)</option>
            <option value="rejeitado">Com rejeição (algum destino rejeitado)</option>
            <option value="todos">Todos</option>
          </select>
          <button
            type="button"
            className="ghost btn-with-icon btn-action-refresh"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {(error || queryErrorMessage) && <p className="status-error">{error || queryErrorMessage}</p>}
        {successMessage && <p className="status-info">{successMessage}</p>}

        {isLoading && candidates.length === 0 ? (
          <p>Carregando candidates…</p>
        ) : candidates.length === 0 ? (
          <p className="status-info">
            Nenhum candidato no filtro atual. Use <strong>Importar do Google Maps</strong> pra
            buscar novas empresas.
          </p>
        ) : (
          <ul className="candidate-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {candidates.map((c) => (
              <CandidateRow
                key={c.id}
                candidate={c}
                onPromoteEmpresa={() => setPromotingEmpresaCandidate(c)}
                onPromotePonto={() => setPromotingPontoCandidate(c)}
                onPromoteTelefone={() => setPromotingTelefoneCandidate(c)}
                onReject={(destino) => handleReject(c, destino)}
              />
            ))}
          </ul>
        )}
      </section>

      <PromoteToEmpresaModal
        candidate={promotingEmpresaCandidate}
        onClose={() => setPromotingEmpresaCandidate(null)}
        onSuccess={(msg) => {
          setPromotingEmpresaCandidate(null);
          handlePromoteSuccess(msg);
        }}
        onError={handlePromoteError}
      />
      <PromoteToPontoModal
        candidate={promotingPontoCandidate}
        onClose={() => setPromotingPontoCandidate(null)}
        onSuccess={(msg) => {
          setPromotingPontoCandidate(null);
          handlePromoteSuccess(msg);
        }}
        onError={handlePromoteError}
      />
      <PromoteToTelefoneModal
        candidate={promotingTelefoneCandidate}
        onClose={() => setPromotingTelefoneCandidate(null)}
        onSuccess={(msg) => {
          setPromotingTelefoneCandidate(null);
          handlePromoteSuccess(msg);
        }}
        onError={handlePromoteError}
      />
    </section>
  );
}

// Sub-componente: linha de candidato com botoes/badges por destino.
// Inline ao inves de em arquivo separado pra manter a tela coesa enquanto
// nao precisa de tests proprios. Extrair quando passar de ~80 linhas.
type CandidateRowProps = {
  candidate: ImportCandidate;
  onPromoteEmpresa: () => void;
  onPromotePonto: () => void;
  onPromoteTelefone: () => void;
  onReject: (destino: CandidateDestino) => void;
};

function CandidateRow({
  candidate,
  onPromoteEmpresa,
  onPromotePonto,
  onPromoteTelefone,
  onReject,
}: CandidateRowProps) {
  return (
    <li
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{candidate.nome}</h3>
          <p style={{ margin: "4px 0", fontSize: "0.875rem", color: "#6b7280" }}>
            {candidate.formattedAddress ?? "(sem endereço)"}
            {candidate.telefone && ` • ${candidate.telefone}`}
          </p>
          {candidate.types.length > 0 && (
            <p style={{ margin: "4px 0", fontSize: "0.75rem", color: "#9ca3af" }}>
              Tipos: {candidate.types.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <DestinoActions
          label="Empresa"
          status={candidate.empresaStatus}
          onPromote={onPromoteEmpresa}
          onReject={() => onReject("empresa")}
        />
        <DestinoActions
          label="Ponto Institucional"
          status={candidate.pontoStatus}
          onPromote={onPromotePonto}
          onReject={() => onReject("ponto")}
        />
        <DestinoActions
          label="Telefone Útil"
          status={candidate.telefoneStatus}
          onPromote={onPromoteTelefone}
          onReject={() => onReject("telefone")}
        />
      </div>
    </li>
  );
}

type DestinoActionsProps = {
  label: string;
  status: ImportCandidate["empresaStatus"];
  onPromote: () => void;
  onReject: () => void;
};

function DestinoActions({ label, status, onPromote, onReject }: DestinoActionsProps) {
  if (status === "aprovado") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.875rem" }}>
        <span style={{ color: "#16a34a" }}>✓ {label}</span>
      </div>
    );
  }
  if (status === "rejeitado") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.875rem" }}>
        <span style={{ color: "#9ca3af" }}>✗ {label} (rejeitado)</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button type="button" className="ghost btn-with-icon" onClick={onPromote}>
        {label}
      </button>
      <button
        type="button"
        className="ghost btn-with-icon"
        onClick={onReject}
        title={`Rejeitar como ${label}`}
        style={{ color: "#dc2626" }}
      >
        ✗
      </button>
    </div>
  );
}
