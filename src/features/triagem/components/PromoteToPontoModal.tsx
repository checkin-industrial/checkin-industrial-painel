import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../shared/api/apiClient";
import {
  INITIAL_FORM_PONTO,
  TIPO_OPTIONS,
  type PontoInstitucionalPayload,
} from "../../pontosInstitucionais/types";
import type { ImportCandidate } from "../types";

type Props = {
  candidate: ImportCandidate | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

// Modal de promoção de candidato a Ponto Institucional. Pré-preenche
// nome/endereço/lat-lng/telefone (em contatoTelefone) do candidato. Admin
// escolhe tipo + descrição + cor/ícone.
export function PromoteToPontoModal({ candidate, onClose, onSuccess, onError }: Props) {
  const [formData, setFormData] = useState<PontoInstitucionalPayload>(INITIAL_FORM_PONTO);
  const [submitting, setSubmitting] = useState(false);

  const initialFromCandidate = useMemo<PontoInstitucionalPayload | null>(() => {
    if (!candidate) return null;
    // Heurística simples: types do Google → categoria de ponto. Hotel/lodging
    // vira "hotel", restaurant → "servico", outros → "comercio" (default).
    // Admin pode trocar manualmente.
    let tipoSugerido = "comercio";
    if (candidate.types.some((t) => t === "hotel" || t === "lodging")) tipoSugerido = "hotel";
    else if (candidate.types.some((t) => t === "restaurant")) tipoSugerido = "servico";

    return {
      ...INITIAL_FORM_PONTO,
      nome: candidate.nome,
      tipo: tipoSugerido,
      endereco: candidate.formattedAddress ?? "",
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      contatoTelefone: candidate.telefone ?? "",
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

    const payload: PontoInstitucionalPayload = {
      ...formData,
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim(),
      endereco: formData.endereco.trim(),
    };

    try {
      await apiFetch("POST", `/api/import/candidates/${candidate.id}/promote-ponto`, { body: payload });
      onSuccess(`"${candidate.nome}" promovido a Ponto Institucional.`);
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
          <h2>Promover "{candidate.nome}" a Ponto Institucional</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">×</button>
        </div>
        <form onSubmit={handleSubmit} className="company-form">
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
            Tipo *
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              required
            >
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label>
            Descrição *
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
              maxLength={400}
              rows={3}
            />
          </label>
          <label>
            Endereço *
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              required
              maxLength={300}
            />
          </label>
          <label>
            Telefone
            <input
              type="text"
              value={formData.contatoTelefone}
              onChange={(e) => setFormData({ ...formData, contatoTelefone: e.target.value })}
              maxLength={20}
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={formData.contatoEmail}
              onChange={(e) => setFormData({ ...formData, contatoEmail: e.target.value })}
              maxLength={120}
            />
          </label>
          <label>
            Cor do marcador
            <input
              type="color"
              value={formData.corMarcador}
              onChange={(e) => setFormData({ ...formData, corMarcador: e.target.value })}
              aria-label="Cor do marcador no mapa"
            />
          </label>

          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Coordenadas: {formData.latitude}, {formData.longitude} (do Google Maps)
          </p>

          <div className="app-modal-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Promovendo..." : "Promover a Ponto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
