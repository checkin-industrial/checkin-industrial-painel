import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";
import styles from "./TelefonesUteisCardsScreen.module.css";

type TelefoneUtilCardItem = {
  id: string;
  nome: string;
  categoria: string;
  telefone: string;
  ordemExibicao: number;
  ativo: boolean;
};

function normalizeCategoria(categoria: string) {
  return categoria.trim().toLowerCase();
}

function categoriaLabel(categoria: string) {
  switch (normalizeCategoria(categoria)) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return "Emergencia e Servicos Publicos";
    case "transportecultura":
    case "transporte_cultura":
      return "Transporte e Cultura";
    case "hoteispousadas":
    case "hoteis_pousadas":
      return "Hoteis e Pousadas";
    default:
      return "Outros";
  }
}

function categoriaOrder(categoria: string) {
  switch (normalizeCategoria(categoria)) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return 1;
    case "transportecultura":
    case "transporte_cultura":
      return 2;
    case "hoteispousadas":
    case "hoteis_pousadas":
      return 3;
    default:
      return 99;
  }
}

function categoriaCardClass(categoria: string) {
  const base = styles["phone-card"];
  switch (normalizeCategoria(categoria)) {
    case "emergenciaservicospublicos":
    case "emergencia_servicos_publicos":
      return `${base} ${styles["phone-card-emergency"]}`;
    case "transportecultura":
    case "transporte_cultura":
      return `${base} ${styles["phone-card-mobility"]}`;
    case "hoteispousadas":
    case "hoteis_pousadas":
      return `${base} ${styles["phone-card-hospitality"]}`;
    default:
      return base;
  }
}

function normalizePhoneHref(telefone: string) {
  return telefone.replace(/[^\d+]/g, "");
}

export function TelefonesUteisCardsScreen() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: telefones = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["telefones-uteis", "ativos"],
    queryFn: async () => {
      const data = await apiFetch<TelefoneUtilCardItem[]>("GET", "/api/telefones-uteis?ativo=true");
      return (Array.isArray(data) ? data : [])
        .filter((item) => item.ativo)
        .sort((left, right) => {
          const categoriaDiff = categoriaOrder(left.categoria) - categoriaOrder(right.categoria);
          if (categoriaDiff !== 0) return categoriaDiff;
          const ordemDiff = (left.ordemExibicao ?? 0) - (right.ordemExibicao ?? 0);
          if (ordemDiff !== 0) return ordemDiff;
          return left.nome.localeCompare(right.nome);
        });
    },
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const filteredTelefones = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return telefones;
    }

    return telefones.filter((item) => {
      const haystack = [
        item.nome,
        item.categoria,
        categoriaLabel(item.categoria),
        item.telefone,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [searchTerm, telefones]);

  const groupedTelefones = useMemo(() => {
    const grupos = new Map<string, TelefoneUtilCardItem[]>();

    for (const item of filteredTelefones) {
      const categoria = categoriaLabel(item.categoria);
      if (!grupos.has(categoria)) {
        grupos.set(categoria, []);
      }

      grupos.get(categoria)?.push(item);
    }

    return Array.from(grupos.entries()).sort((left, right) => categoriaOrder(left[1][0]?.categoria ?? "") - categoriaOrder(right[1][0]?.categoria ?? ""));
  }, [filteredTelefones]);

  const hasSearch = searchTerm.trim().length > 0;

  return (
    <section className="cards-page">
      <header className="cards-header">
        <div>
          <h2>Telefones Úteis</h2>
          <p>Consulte contatos essenciais da cidade em uma tela dedicada, com busca rápida e acesso direto por categoria.</p>
        </div>
        <div className="cards-toolbar">
          <div className="cards-search-field">
            <span className="cards-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por serviço, categoria ou número"
              aria-label="Buscar telefones úteis"
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
          <span className="cards-result-count" aria-live="polite">{filteredTelefones.length} contatos</span>
        </div>
      </header>

      {error && <p className="status-error">{error}</p>}
      {!error && <p className="status-info">Contatos exibidos: {filteredTelefones.length}</p>}

      {loading && (
        <div className="screen-loading">
          <div className="map-loading-spinner" />
          <span className="map-loading-label">Carregando telefones úteis...</span>
        </div>
      )}

      <div className={styles["phone-groups"]}>
        {groupedTelefones.map(([categoria, itens]) => (
          <section key={categoria} className={styles["phone-group"]}>
            <header className={styles["phone-group-header"]}>
              <h3>{categoria}</h3>
              <span>{itens.length} contatos</span>
            </header>

            <div className={`cards-grid ${styles["phone-cards-grid"]}`}>
              {itens.map((item) => (
                <article key={item.id} className={categoriaCardClass(item.categoria)}>
                  <span className={styles["phone-card-badge"]}>{categoria}</span>
                  <h4>{item.nome}</h4>
                  <p className={styles["phone-card-caption"]}>Contato telefônico disponível para atendimento rápido.</p>
                  <a className={styles["phone-card-link"]} href={`tel:${normalizePhoneHref(item.telefone)}`}>
                    {item.telefone}
                  </a>
                </article>
              ))}
            </div>
          </section>
        ))}

        {!loading && groupedTelefones.length === 0 && (
          <div className="empty-state cards-empty-state">Nenhum telefone útil encontrado para o filtro informado.</div>
        )}
      </div>
    </section>
  );
}