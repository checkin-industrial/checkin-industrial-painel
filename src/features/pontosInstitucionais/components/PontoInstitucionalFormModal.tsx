import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { staticUrl } from "../../../shared/api/apiClient";
import styles from "../PontosInstitucionaisManagementScreen.module.css";
import { TIPO_OPTIONS, type PontoInstitucionalPayload, type UploadCategoria } from "../types";

type PontoInstitucionalFormModalProps = {
  isOpen: boolean;
  editingId: string | null;
  formData: PontoInstitucionalPayload;
  setFormData: Dispatch<SetStateAction<PontoInstitucionalPayload>>;
  submitting: boolean;
  uploadingFoto: boolean;
  uploadingLogo: boolean;
  uploadingCard: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onUploadImagem: (event: ChangeEvent<HTMLInputElement>, categoria: UploadCategoria) => void;
};

// Modal Novo/Editar Ponto Institucional. Recebe state controlado pelo container.
// Suporta upload em 3 categorias (foto do responsavel, logo, card). Previews
// inline quando ja ha URL preenchida no formData.
export function PontoInstitucionalFormModal({
  isOpen,
  editingId,
  formData,
  setFormData,
  submitting,
  uploadingFoto,
  uploadingLogo,
  uploadingCard,
  onSubmit,
  onClose,
  onUploadImagem,
}: PontoInstitucionalFormModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="app-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="app-modal-card app-modal-card--wide" onClick={(event) => event.stopPropagation()}>
        <div className="app-modal-header">
          <h2>{editingId ? "Editar Ponto Institucional" : "Novo Ponto Institucional"}</h2>
          <button type="button" className="app-modal-close btn-with-icon btn-action-close" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="company-form" onSubmit={onSubmit}>
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, tipo: Number(event.target.value) }))
                }
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
              <div className={styles["color-field-group"]}>
                <input
                  type="color"
                  value={formData.corMarcador}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, corMarcador: event.target.value }))
                  }
                />
                <input
                  type="text"
                  value={formData.corMarcador}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, corMarcador: event.target.value }))
                  }
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, iconeMarcador: event.target.value }))
                }
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, ordemExibicao: Number(event.target.value) }))
                }
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, latitude: Number(event.target.value) }))
                }
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, longitude: Number(event.target.value) }))
                }
                required
              />
            </label>

            <label>
              Contato nome
              <input
                type="text"
                value={formData.contatoNome}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, contatoNome: event.target.value }))
                }
                maxLength={180}
                required
              />
            </label>

            <label>
              Contato telefone
              <input
                type="text"
                value={formData.contatoTelefone}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, contatoTelefone: event.target.value }))
                }
                maxLength={20}
                required
              />
            </label>

            <label>
              Contato email
              <input
                type="email"
                value={formData.contatoEmail}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, contatoEmail: event.target.value }))
                }
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
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, descricao: event.target.value }))
              }
              maxLength={400}
              required
            />
          </label>

          <label>
            Atividades disponíveis
            <input
              type="text"
              value={formData.atividadesDisponiveis}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, atividadesDisponiveis: event.target.value }))
              }
              maxLength={300}
              required
            />
          </label>

          <label>
            Equipe de gestão
            <input
              type="text"
              value={formData.equipeGestao}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, equipeGestao: event.target.value }))
              }
              maxLength={250}
              required
            />
          </label>

          <label>
            Foto do responsável (URL)
            <input
              type="text"
              value={formData.responsavelFotoUrl}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, responsavelFotoUrl: event.target.value }))
              }
              maxLength={500}
              placeholder="https://... ou /uploads/..."
            />
          </label>

          <label>
            Upload da foto do responsável
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => onUploadImagem(event, "foto")}
              disabled={uploadingFoto || submitting}
            />
            {uploadingFoto && <small>Enviando foto...</small>}
          </label>

          {formData.responsavelFotoUrl && (
            <div className={styles["upload-preview"]}>
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
              onChange={(event) => onUploadImagem(event, "logo")}
              disabled={uploadingLogo || submitting}
            />
            {uploadingLogo && <small>Enviando logo...</small>}
          </label>

          {formData.logoUrl && (
            <div className={`${styles["upload-preview"]} ${styles["upload-preview--logo"]}`}>
              <span>Pré-visualização do logo</span>
              <img src={staticUrl(formData.logoUrl)} alt="Logo do ponto" loading="lazy" />
            </div>
          )}

          <label>
            Foto principal do card (URL)
            <input
              type="text"
              value={formData.cardFotoUrl}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, cardFotoUrl: event.target.value }))
              }
              maxLength={500}
              placeholder="https://... ou /uploads/..."
            />
          </label>

          <label>
            Upload da foto principal do card
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => onUploadImagem(event, "card")}
              disabled={uploadingCard || submitting}
            />
            {uploadingCard && <small>Enviando imagem de card...</small>}
          </label>

          {formData.cardFotoUrl && (
            <div className={`${styles["upload-preview"]} ${styles["upload-preview--cover"]}`}>
              <span>Pré-visualização da imagem do card</span>
              <img src={staticUrl(formData.cardFotoUrl)} alt="Foto principal do card" loading="lazy" />
            </div>
          )}

          <div className="company-form-actions">
            <button type="submit" className="btn-with-icon btn-action-save" disabled={submitting}>
              {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar Ponto"}
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
