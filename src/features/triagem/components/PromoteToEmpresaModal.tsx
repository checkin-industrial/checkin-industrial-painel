import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../shared/api/apiClient";
import type { EmpresaCreatePayload } from "../../empresas/types";
import { INITIAL_FORM } from "../../empresas/types";
import type { ImportCandidate } from "../types";

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

type Props = {
  candidate: ImportCandidate | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

// Modal de promoção de candidato a Empresa. Pré-preenche nome/endereço/lat-lng/
// telefone com dados do candidato. Admin completa CNPJ, CNAE, setor, etc.
// (campos obrigatórios pra Empresa). Reutiliza EmpresaCreatePayload da feature
// empresas pra manter um único formato de payload.
export function PromoteToEmpresaModal({ candidate, onClose, onSuccess, onError }: Props) {
  const [formData, setFormData] = useState<EmpresaCreatePayload>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const initialFromCandidate = useMemo<EmpresaCreatePayload | null>(() => {
    if (!candidate) return null;
    return {
      ...INITIAL_FORM,
      nomeFantasia: candidate.nome,
      razaoSocial: candidate.nome,
      endereco: candidate.formattedAddress ?? "",
      telefone: candidate.telefone ?? "",
      cep: candidate.cepOrigem ?? "",
      latitude: candidate.latitude,
      longitude: candidate.longitude,
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
      await apiFetch("POST", `/api/import/candidates/${candidate.id}/promote-empresa`, { body: payload });
      onSuccess(`"${candidate.nome}" promovido a Empresa.`);
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
          <h2>Promover "{candidate.nome}" a Empresa</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">×</button>
        </div>
        <form onSubmit={handleSubmit} className="company-form">
          <p className="status-info" style={{ fontSize: "0.875rem" }}>
            Preencha os campos obrigatórios (CNPJ, CNAE, setor, porte) antes de
            promover. Nome/endereço/coordenadas vêm do Google Maps.
          </p>

          <label>
            CNPJ *
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              required
              maxLength={18}
              placeholder="00.000.000/0000-00"
            />
          </label>
          <label>
            Razão Social *
            <input
              type="text"
              value={formData.razaoSocial}
              onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
              required
              maxLength={200}
            />
          </label>
          <label>
            Nome Fantasia *
            <input
              type="text"
              value={formData.nomeFantasia}
              onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
              required
              maxLength={200}
            />
          </label>
          <label>
            CNAE Principal (7 dígitos) *
            <input
              type="text"
              value={formData.cnaePrincipal}
              onChange={(e) => setFormData({ ...formData, cnaePrincipal: e.target.value })}
              required
              pattern="\d{7}"
              placeholder="0000000"
            />
          </label>
          <label>
            Setor *
            <select
              value={formData.setor}
              onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
              required
            >
              <option value="industria">Indústria</option>
              <option value="comercio">Comércio</option>
              <option value="servicos">Serviços</option>
            </select>
          </label>
          <label>
            Porte *
            <select
              value={formData.porte}
              onChange={(e) => setFormData({ ...formData, porte: e.target.value })}
              required
            >
              <option value="mei">MEI</option>
              <option value="me">ME</option>
              <option value="epp">EPP</option>
              <option value="ltda">LTDA</option>
              <option value="sa">S.A.</option>
            </select>
          </label>
          <label>
            Nº Funcionários
            <input
              type="number"
              min={0}
              value={formData.numeroFuncionarios}
              onChange={(e) => setFormData({ ...formData, numeroFuncionarios: Number(e.target.value) })}
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
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              maxLength={20}
            />
          </label>
          <label>
            CEP *
            <input
              type="text"
              value={formData.cep}
              onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              required
              maxLength={9}
              placeholder="00000-000"
            />
          </label>
          <label>
            Município *
            <input
              type="text"
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              required
              maxLength={100}
            />
          </label>
          <label>
            Descrição CNAE *
            <input
              type="text"
              value={formData.descricaoCnae}
              onChange={(e) => setFormData({ ...formData, descricaoCnae: e.target.value })}
              required
              maxLength={300}
            />
          </label>
          <label>
            Matriz ou Filial *
            <select
              value={formData.matrizOuFilial}
              onChange={(e) => setFormData({ ...formData, matrizOuFilial: e.target.value })}
            >
              <option value="matriz">Matriz</option>
              <option value="filial">Filial</option>
            </select>
          </label>
          <label>
            Situação Cadastral *
            <select
              value={formData.situacaoCadastral}
              onChange={(e) => setFormData({ ...formData, situacaoCadastral: e.target.value })}
            >
              <option value="ativa">Ativa</option>
              <option value="suspensa">Suspensa</option>
              <option value="inapta">Inapta</option>
              <option value="baixada">Baixada</option>
              <option value="nula">Nula</option>
            </select>
          </label>

          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Coordenadas: {formData.latitude}, {formData.longitude} (do Google Maps)
          </p>

          <div className="app-modal-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Promovendo..." : "Promover a Empresa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
