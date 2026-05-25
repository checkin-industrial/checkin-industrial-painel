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
  empresaId?: string;
  motivo?: string;
};

type ImportResult = {
  operacaoId: string;
  encontrados: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  itens: ImportResultItem[];
};

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

type GoogleMapsImportScreenProps = {
  onGoToManagement?: () => void;
};

export function GoogleMapsImportScreen({ onGoToManagement }: GoogleMapsImportScreenProps) {
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
      // Invalida cache de empresas pra Management Screen refletir as novas linhas
      // assim que o admin clicar em "Ir para revisar".
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
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
          Busca empresas via Google Places no raio especificado e cadastra cada uma com
          status <strong>Aguardando revisão</strong>. Revise os cadastros antes de aprovar
          (botão <em>Aprovar</em> em Gestão de Empresas).
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
            <strong>{result.encontrados}</strong> empresa(s) encontrada(s) —{" "}
            <strong>{result.criados}</strong> criada(s),{" "}
            <strong>{result.atualizados}</strong> atualizada(s),{" "}
            <strong>{result.ignorados}</strong> ignorada(s).
          </p>

          {onGoToManagement && result.criados > 0 && (
            <button type="button" className="btn-with-icon btn-action-reactivate" onClick={onGoToManagement}>
              Ir para revisar empresas aguardando aprovação
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
