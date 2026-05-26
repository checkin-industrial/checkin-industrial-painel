import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";

// "sem-filtro" deve aparecer primeiro: e o opt-out do filtro de tipo, util pra
// explorar uma regiao sem pre-filtrar. Mapeia pra request sem includedTypes na
// Places API (New). "industria" mapeia internamente pra "manufacturer" (api#22).
const TIPOS_SUPORTADOS = [
  { value: "sem-filtro", label: "Todos os tipos" },
  { value: "industria", label: "Indústria" },
  { value: "loja", label: "Loja" },
  { value: "supermercado", label: "Supermercado" },
  { value: "farmacia", label: "Farmácia" },
  { value: "restaurante", label: "Restaurante" },
  { value: "hotel", label: "Hotel" },
  { value: "posto-combustivel", label: "Posto de combustível" },
  { value: "banco", label: "Banco" },
  { value: "oficina-mecanica", label: "Oficina mecânica" },
  { value: "loja-veiculos", label: "Loja de veículos" },
];

type ImportResultItem = {
  googlePlaceId: string;
  nome: string;
  acao: "criado" | "atualizado" | "ignorado";
  candidateId?: string;
  motivo?: string;
};

// Response do POST /import/google-maps. Mudou semanticamente: agora cria
// CANDIDATES (entidade de triagem) em vez de Empresas direto. Admin promove
// individualmente cada candidato pra Empresa/Ponto/Telefone (ou rejeita)
// na tela "Triagem de Importações".
type ImportResult = {
  operacaoId: string;
  encontrados: number;
  candidatesCriados: number;
  candidatesAtualizados: number;
  candidatesIgnorados: number;
  itens: ImportResultItem[];
};

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

type GoogleMapsImportScreenProps = {
  onGoToTriagem?: () => void;
};

export function GoogleMapsImportScreen({ onGoToTriagem }: GoogleMapsImportScreenProps) {
  const queryClient = useQueryClient();
  const [cep, setCep] = useState("");
  const [raioMetros, setRaioMetros] = useState(800);
  const [tipo, setTipo] = useState(TIPOS_SUPORTADOS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const cepLimpo = sanitizeDigits(cep);
    if (cepLimpo.length !== 8) {
      setError("CEP deve ter 8 dígitos.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch<ImportResult>("POST", "/api/empresas/import/google-maps", {
        body: { cep: cepLimpo, raioMetros, tipo },
      });
      setResult(data);
      // Invalida cache da Triagem pra refletir os novos candidates no proximo
      // load da tela. Empresas/Pontos/Telefones nao mudam (a criacao acontece
      // so depois que o admin promover via Triagem).
      queryClient.invalidateQueries({ queryKey: ["import-candidates"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar via Google Maps.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-section">
      <header className="section-header">
        <h2>Importar Empresas do Google Maps</h2>
        <p className="section-description">
          Busca lugares via Google Places no raio especificado e cria
          <strong> candidatos de triagem</strong>. Na tela <em>Triagem de Importações</em>,
          revise cada candidato e decida individualmente se vira Empresa, Ponto
          Institucional, Telefone Útil — ou rejeite.
        </p>
      </header>

      <form className="company-form google-maps-import-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field">
            <span>CEP de origem</span>
            <input
              type="text"
              value={cep}
              onChange={(event) => setCep(event.target.value)}
              placeholder="17012000"
              maxLength={9}
              required
            />
            <small>O CEP é geocodificado para definir o centro da busca.</small>
          </label>

          <label className="form-field">
            <span>Raio (metros)</span>
            <input
              type="number"
              value={raioMetros}
              onChange={(event) => setRaioMetros(Number(event.target.value))}
              min={100}
              max={10000}
              step={100}
              required
            />
            <small>Entre 100 m e o máximo permitido pelo servidor.</small>
          </label>

          <label className="form-field">
            <span>Tipo de empresa</span>
            <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
              {TIPOS_SUPORTADOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <small>Mapeado para um ou mais tipos da Google Places.</small>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-with-icon btn-action-new" disabled={submitting}>
            {submitting ? "Importando…" : "Importar"}
          </button>
        </div>

        {error && <p className="status-error">{error}</p>}
      </form>

      {result && (
        <section className="google-maps-import-result">
          <h3>Resultado da importação</h3>
          <p>
            <strong>{result.encontrados}</strong> lugar(es) encontrado(s) —{" "}
            <strong>{result.candidatesCriados}</strong> candidato(s) novo(s),{" "}
            <strong>{result.candidatesAtualizados}</strong> atualizado(s),{" "}
            <strong>{result.candidatesIgnorados}</strong> ignorado(s).
          </p>

          {onGoToTriagem && (result.candidatesCriados > 0 || result.candidatesAtualizados > 0) && (
            <button type="button" className="btn-with-icon btn-action-reactivate" onClick={onGoToTriagem}>
              Ir para triagem dos candidatos
            </button>
          )}

          <div className="table-wrapper">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ação</th>
                  <th>Place ID</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {result.itens.map((item) => (
                  <tr key={item.googlePlaceId}>
                    <td data-label="Nome">{item.nome || "(sem nome)"}</td>
                    <td data-label="Ação">
                      <span className={`tipo-badge ${item.acao === "criado" ? "ativa" : item.acao === "atualizado" ? "aguardando" : "inativa"}`}>
                        {item.acao}
                      </span>
                    </td>
                    <td data-label="Place ID"><code>{item.googlePlaceId}</code></td>
                    <td data-label="Motivo">{item.motivo ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="section-description">
            ID da operação: <code>{result.operacaoId}</code>
          </p>
        </section>
      )}
    </section>
  );
}
