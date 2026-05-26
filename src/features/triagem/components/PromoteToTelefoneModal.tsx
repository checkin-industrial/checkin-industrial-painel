import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../shared/api/apiClient";
import type { ImportCandidate } from "../types";

// Espelha CategoriaTelefoneUtil (enum int na API).
const CATEGORIA_OPTIONS = [
  { value: 1, label: "Emergência / Serviços Públicos" },
  { value: 2, label: "Transporte / Cultura" },
  { value: 3, label: "Hotéis / Pousadas" },
] as const;

type TelefoneFormData = {
  nome: string;
  categoria: number;
  telefone: string;
};

const INITIAL_FORM: TelefoneFormData = {
  nome: "",
  categoria: 1,
  telefone: "",
};

type Props = {
  candidate: ImportCandidate | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function PromoteToTelefoneModal({ candidate, onClose, onSuccess, onError }: Props) {
  const [formData, setFormData] = useState<TelefoneFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const initialFromCandidate = useMemo<TelefoneFormData | null>(() => {
    if (!candidate) return null;
    // Heurística: hotel/lodging → categoria 3 (HoteisPousadas); demais → 1 default
    let categoriaSugerida = 1;
    if (candidate.types.some((t) => t === "hotel" || t === "lodging")) categoriaSugerida = 3;
    return {
      nome: candidate.nome,
      categoria: categoriaSugerida,
      telefone: candidate.telefone ?? "",
    };
  }, [candidate]);

  useEffect(() => {
    if (initialFromCandidate) {
      setFormData(initialFromCandidate);
    }
  }, [initialFromCandidate]);

  if (!candidate) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidate) return;
    setSubmitting(true);

    const payload = {
      nome: formData.nome.trim(),
      categoria: formData.categoria,
      telefone: formData.telefone.trim(),
    };

    try {
      await apiFetch("POST", `/api/import/candidates/${candidate.id}/promote-telefone`, { body: payload });
      onSuccess(`"${candidate.nome}" promovido a Telefone Útil.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro ao promover candidato.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-modal-backdrop" onClick={onClose}>
      <div className="app-modal" onClick={(e) => e.stopPropagation()}>
        <div className="app-modal-header">
          <h2>Promover "{candidate.nome}" a Telefone Útil</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">×</button>
        </div>
        <form onSubmit={handleSubmit} className="company-form">
          <p className="status-info" style={{ fontSize: "0.875rem" }}>
            Use esta opção apenas se o lugar fizer sentido como telefone público
            de utilidade (emergência, transporte, hotelaria). Para outros casos,
            prefira Empresa ou Ponto Institucional.
          </p>

          <label>
            Nome *
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
              maxLength={180}
            />
          </label>
          <label>
            Categoria *
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: Number(e.target.value) })}
              required
            >
              {CATEGORIA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label>
            Telefone *
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              required
              maxLength={80}
              placeholder="(14) 3333-4444 ou 193"
            />
          </label>

          <div className="app-modal-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Promovendo..." : "Promover a Telefone Útil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
