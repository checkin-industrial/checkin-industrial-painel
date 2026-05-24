import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, staticUrl } from "../../shared/api/apiClient";
import styles from "./PontosInstitucionaisCardsScreen.module.css";

type PontoInstitucionalCardItem = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  endereco: string;
  atividadesDisponiveis: string;
  equipeGestao: string;
  contatoNome: string;
  contatoTelefone: string;
  contatoEmail: string;
  responsavelFotoUrl?: string | null;
  logoUrl?: string | null;
  cardFotoUrl?: string | null;
  latitude: number;
  longitude: number;
  corMarcador: string;
  iconeMarcador: string;
  ordemExibicao: number;
  ativo: boolean;
};

type PontosInstitucionaisCardsScreenProps = {
  onRouteToPoint?: (point: { id: string; nome: string; latitude: number; longitude: number }) => void;
};

function tipoLabel(tipo: string) {
  const normalized = tipo.trim().toLowerCase();

  switch (normalized) {
    case "educacao":
      return "Educacao";
    case "comercio":
      return "Comercio";
    case "financeiro":
      return "Financeiro";
    case "servico":
      return "Serviço";
    case "setorprefeitura":
    case "setor_prefeitura":
      return "Setor Prefeitura";
    case "pontoturistico":
      return "Ponto Turistico";
    case "hotel":
      return "Hotel / Hospedagem";
    case "ecoturismo":
      return "Ecoturismo";
    default:
      return tipo;
  }
}

function firstAvailableImage(item: PontoInstitucionalCardItem) {
  if (item.cardFotoUrl?.trim()) {
    return staticUrl(item.cardFotoUrl);
  }

  if (item.logoUrl?.trim()) {
    return staticUrl(item.logoUrl);
  }

  if (item.responsavelFotoUrl?.trim()) {
    return staticUrl(item.responsavelFotoUrl);
  }

  return null;
}

export function PontosInstitucionaisCardsScreen({ onRouteToPoint }: PontosInstitucionaisCardsScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  const {
    data: pontos = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["pontos-institucionais", "ativos"],
    queryFn: async () => {
      const data = await apiFetch<PontoInstitucionalCardItem[]>(
        "GET",
        "/api/pontos-institucionais?ativo=true",
      );
      const list = Array.isArray(data) ? data : [];
      list.sort((left, right) => (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0));
      return list;
    },
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const filteredPontos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return pontos;
    }

    return pontos.filter((item) => {
      const haystack = [
        item.nome,
        item.tipo,
        item.descricao,
        item.endereco,
        item.atividadesDisponiveis,
        item.equipeGestao,
        item.contatoNome,
        item.contatoTelefone,
        item.contatoEmail,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [pontos, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;

  function handleRouteToPoint(item: PontoInstitucionalCardItem) {
    if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
      return;
    }

    onRouteToPoint?.({
      id: item.id,
      nome: item.nome,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  }

  return (
    <section className="cards-page">
      <header className="cards-header">
        <div>
          <h2>Pontos Institucionais</h2>
          <p>Explore pontos de interesse com visual compacto e busca rápida.</p>
        </div>
        <div className="cards-toolbar">
          <div className="cards-search-field">
            <span className="cards-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, endereço, tipo, atividade ou contato"
              aria-label="Buscar locais úteis"
            />
            {hasSearch && (
              <button
                type="button"
                className="cards-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Limpar busca"
                title="Limpar busca"
              >
                x
              </button>
            )}
          </div>
          <span className="cards-result-count" aria-live="polite">{filteredPontos.length} resultados</span>
        </div>
      </header>

      {error && <p className="status-error">{error}</p>}
      {!error && <p className="status-info">Cards exibidos: {filteredPontos.length}</p>}

      {loading && (
        <div className="screen-loading">
          <div className="map-loading-spinner" />
          <span className="map-loading-label">Carregando locais úteis...</span>
        </div>
      )}

      <div className="cards-grid">
        {filteredPontos.map((item) => {
          const imageUrl = firstAvailableImage(item);
          const isFlipped = flippedCardId === item.id;
          const responsavelFotoUrl = item.responsavelFotoUrl?.trim() ? staticUrl(item.responsavelFotoUrl) : null;

          return (
            <article
              key={item.id}
              className={isFlipped ? `${styles["institution-card"]} ${styles["is-flipped"]}` : styles["institution-card"]}
            >
              <div className={styles["institution-card-inner"]}>
                <div className={styles["institution-card-front"]}>
                  <div className={styles["institution-card-media"]}>
                    {imageUrl
                      ? <img src={imageUrl} alt={`Imagem de ${item.nome}`} loading="lazy" />
                      : <div className={styles["institution-card-placeholder"]}>Sem imagem</div>}
                    <span className={styles["institution-card-badge"]}>{tipoLabel(item.tipo)}</span>
                  </div>

                  <div className={styles["institution-card-body"]}>
                    <div className={styles["institution-card-title-row"]}>
                      {item.logoUrl && (
                        <img
                          className={styles["institution-card-name-logo"]}
                          src={staticUrl(item.logoUrl)}
                          alt={`Logo de ${item.nome}`}
                          loading="lazy"
                        />
                      )}
                      <h3>{item.nome}</h3>
                    </div>
                    <div className={styles["institution-card-description-line"]}>
                      <p>{item.descricao}</p>
                    </div>

                    <p className={styles["institution-card-address"]}>{item.endereco}</p>
                    <button
                      type="button"
                      className={styles["institution-card-flip-btn"]}
                      onClick={() => setFlippedCardId(item.id)}
                      aria-label={`Virar card ${item.nome}`}
                    >
                      Ver mais
                    </button>
                  </div>
                </div>

                <div className={styles["institution-card-back"]}>
                  <div className={styles["institution-card-body"]}>
                    <div className={styles["institution-card-back-top"]}>
                      <h3>{item.nome}</h3>
                      {responsavelFotoUrl ? (
                        <img
                          src={responsavelFotoUrl}
                          alt={`Foto do responsável por ${item.nome}`}
                          loading="lazy"
                          className={styles["institution-card-responsavel-photo"]}
                        />
                      ) : (
                        <div className={styles["institution-card-responsavel-placeholder"]}>Sem foto</div>
                      )}
                    </div>
                    <p><strong>Tipo:</strong> {tipoLabel(item.tipo)}</p>
                    <p><strong>Descrição:</strong> {item.descricao || "-"}</p>
                    <div className={styles["institution-card-address-row"]}>
                      <p><strong>Endereço:</strong> {item.endereco || "-"}</p>
                      <button
                        type="button"
                        className={styles["institution-card-route-btn"]}
                        onClick={() => handleRouteToPoint(item)}
                        aria-label={`Traçar rota para ${item.nome}`}
                        title="Traçar rota"
                      >
                        Rota
                      </button>
                    </div>
                    <p><strong>Atividades:</strong> {item.atividadesDisponiveis || "-"}</p>
                    <p><strong>Equipe:</strong> {item.equipeGestao || "-"}</p>
                    <p><strong>Contato:</strong> {item.contatoNome || "-"}</p>
                    <p><strong>Telefone:</strong> {item.contatoTelefone || "-"}</p>
                    <p><strong>Email:</strong> {item.contatoEmail || "-"}</p>
                    {/* <p><strong>Status:</strong> {item.ativo ? "Ativo" : "Inativo"}</p> */}
                    {/* <p><strong>Coordenadas:</strong> {Number.isFinite(item.latitude) ? item.latitude.toFixed(5) : "-"}, {Number.isFinite(item.longitude) ? item.longitude.toFixed(5) : "-"}</p> */}
                    <button
                      type="button"
                      className={styles["institution-card-flip-btn"]}
                      onClick={() => setFlippedCardId(null)}
                      aria-label={`Voltar para frente do card ${item.nome}`}
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {!loading && filteredPontos.length === 0 && (
          <div className="empty-state cards-empty-state">Nenhum ponto institucional encontrado para o filtro informado.</div>
        )}
      </div>
    </section>
  );
}
