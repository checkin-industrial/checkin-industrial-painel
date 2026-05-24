import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { EmpresaCreatePayload } from "../types";

// INITIAL_FORM vive em ../types.ts (Fast Refresh exige .tsx so com componentes).
// Re-exportado aqui pra evitar mexer em call sites antigos.
export { INITIAL_FORM } from "../types";

// Os valores correspondem aos nomes dos enums no backend (camelCase via
// JsonStringEnumConverter). Mantemos labels PT-BR pra UI.
const SETOR_OPTIONS = [
  { value: "industria", label: "Industria" },
  { value: "comercio", label: "Comercio" },
  { value: "servicos", label: "Servicos" },
];

const PORTE_OPTIONS = [
  { value: "mei", label: "MEI" },
  { value: "me", label: "ME" },
  { value: "epp", label: "EPP" },
  { value: "ltda", label: "LTDA" },
  { value: "sa", label: "S/A" },
];

const MATRIZ_FILIAL_OPTIONS = [
  { value: "matriz", label: "Matriz" },
  { value: "filial", label: "Filial" },
];

const SITUACAO_OPTIONS = [
  { value: "ativa", label: "Ativa" },
  { value: "inativa", label: "Inativa" },
  { value: "suspensa", label: "Suspensa" },
  { value: "baixada", label: "Baixada" },
];

type EmpresaFormModalProps = {
  isOpen: boolean;
  editingId: string | null;
  formData: EmpresaCreatePayload;
  setFormData: Dispatch<SetStateAction<EmpresaCreatePayload>>;
  submitting: boolean;
  geocoding: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onGeocode: () => void;
};

// Modal Nova/Editar Empresa. Recebe state controlado pelo container; renderiza
// form completo + acoes (geocode, salvar, cancelar). Status/erro/success
// messages aparecem na lista (fora do modal) - aqui so o form em si.
export function EmpresaFormModal({
  isOpen,
  editingId,
  formData,
  setFormData,
  submitting,
  geocoding,
  onSubmit,
  onClose,
  onGeocode,
}: EmpresaFormModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="app-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="app-modal-card app-modal-card--wide" onClick={(event) => event.stopPropagation()}>
        <div className="app-modal-header">
          <h2>{editingId ? "Editar Empresa" : "Nova Empresa"}</h2>
          <button type="button" className="app-modal-close btn-with-icon btn-action-close" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="company-form" onSubmit={onSubmit}>
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
                onChange={(event) => setFormData((prev) => ({ ...prev, setor: event.target.value }))}
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
                onChange={(event) => setFormData((prev) => ({ ...prev, porte: event.target.value }))}
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, numeroFuncionarios: Number(event.target.value) }))
                }
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, matrizOuFilial: event.target.value }))
                }
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, situacaoCadastral: event.target.value }))
                }
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
              onClick={onGeocode}
              disabled={submitting || geocoding || !formData.endereco.trim()}
            >
              {geocoding ? "Geocodificando..." : "Atualizar Geolocalização"}
            </button>
            <button type="submit" className="btn-with-icon btn-action-save" disabled={submitting}>
              {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Empresa"}
            </button>
            <button
              type="button"
              className="ghost btn-with-icon btn-action-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
