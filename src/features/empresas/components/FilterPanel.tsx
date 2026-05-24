import type { useDraggable } from "../../../shared/hooks/useDraggable";
import { useMapContext } from "../useMapContext";
import type { FilterFormState, PontoInstitucionalFilterState } from "../types";
import styles from "./FilterPanel.module.css";

// Opcoes estaticas do painel - manter aqui (encapsulado na sub-feature do filtro)
// evita o container principal ter mais constantes que nao precisa enxergar.
const SETOR_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "industria", label: "Indústria" },
  { value: "comercio", label: "Comércio" },
  { value: "servicos", label: "Serviços" },
];

const PORTE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "MEI", label: "MEI" },
  { value: "ME", label: "ME" },
  { value: "EPP", label: "EPP" },
  { value: "LTDA", label: "LTDA" },
  { value: "SA", label: "S/A" },
];

const SITUACAO_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "ativa", label: "Ativa" },
  { value: "inativa", label: "Inativa" },
  { value: "suspensa", label: "Suspensa" },
  { value: "baixada", label: "Baixada" },
];

const PONTO_INSTITUCIONAL_TIPO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "educacao", label: "Educação" },
  { value: "comercio", label: "Comércio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "servico", label: "Serviço" },
  { value: "setorprefeitura", label: "Setor Prefeitura" },
  { value: "pontoturistico", label: "Ponto Turístico" },
  { value: "hotel", label: "Hotel / Hospedagem" },
  { value: "ecoturismo", label: "Ecoturismo" },
];

// Handlers que pertencem ao container principal (mudam state derivado, refetch, etc.)
// sao passados via props. Tudo o que e leitura ou flag local consome do Context.
type FilterPanelProps = {
  draggable: ReturnType<typeof useDraggable>;
  onFilterChange: (field: keyof FilterFormState, value: string) => void;
  onPontoFilterChange: (field: keyof PontoInstitucionalFilterState, value: string) => void;
  onToggleEmpresaBusca: () => void;
  onTogglePontosBusca: () => void;
  onClear: () => void;
  loading: boolean;
  error: string | null;
  pontosFiltradosCount: number;
};

export function FilterPanel({
  draggable,
  onFilterChange,
  onPontoFilterChange,
  onToggleEmpresaBusca,
  onTogglePontosBusca,
  onClear,
  loading,
  error,
  pontosFiltradosCount,
}: FilterPanelProps) {
  const {
    empresas,
    filters,
    pontoFilters,
    cnaeOptions,
    municipioOptions,
    empresaBuscaAtiva,
    pontosBuscaAtiva,
    panelsVisible,
    filtersCollapsed,
    setFiltersCollapsed,
    empresaFiltersCollapsed,
    setEmpresaFiltersCollapsed,
    pontosFiltersCollapsed,
    setPontosFiltersCollapsed,
    empresaFiltersVisible,
    setEmpresaFiltersVisible,
    pontosFiltersVisible,
    setPontosFiltersVisible,
  } = useMapContext();

  if (!panelsVisible.filtros) {
    return null;
  }

  // styles[*] = classes locais ao module; "map-side-panel*"/"draggable-panel"/"dragging"
  // ficam globais (compartilhadas com NeighborhoodReportPanel + outras).
  const baseClass = `${styles["filters-panel"]} map-side-panel map-side-panel--filters draggable-panel`;
  const formClassName = [
    baseClass,
    filtersCollapsed ? styles.collapsed : null,
    draggable.isDragging ? "dragging" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className="map-right-sidebar map-right-sidebar--animated">
      <form
        ref={draggable.ref as React.RefObject<HTMLFormElement>}
        className={formClassName}
      >
        <div
          className="panel-toggle-header"
          onMouseDown={draggable.handleMouseDown}
          style={{ cursor: draggable.isDragging ? "grabbing" : "grab" }}
        >
          <h2>Filtros</h2>
          <button
            type="button"
            className="panel-icon-btn"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => setFiltersCollapsed((prev) => !prev)}
            aria-expanded={!filtersCollapsed}
            aria-label={filtersCollapsed ? "Expandir painel de filtros" : "Minimizar painel de filtros"}
            title={filtersCollapsed ? "Expandir" : "Minimizar"}
          >
            <span aria-hidden="true">{filtersCollapsed ? "+" : "-"}</span>
          </button>
        </div>

        {!filtersCollapsed && (
          <>
            <input
              type="search"
              className={styles["filters-panel__search"]}
              value={filters.nomeFantasia}
              onChange={(event) => onFilterChange("nomeFantasia", event.target.value)}
              placeholder="Buscar empresa por nome fantasia"
              aria-label="Buscar empresa por nome fantasia"
              disabled={!empresaBuscaAtiva}
            />

            <div className={styles["filters-panel__content"]}>
              {(!empresaFiltersVisible || !pontosFiltersVisible) && (
                <div className={styles["filters-panel__restore-row"]}>
                  {!empresaFiltersVisible && (
                    <button type="button" className={styles["restore-box-btn"]} onClick={() => setEmpresaFiltersVisible(true)}>
                      Mostrar Empresas
                    </button>
                  )}
                  {!pontosFiltersVisible && (
                    <button type="button" className={styles["restore-box-btn"]} onClick={() => setPontosFiltersVisible(true)}>
                      Mostrar Pontos Turísticos
                    </button>
                  )}
                </div>
              )}

              {empresaFiltersVisible && (
                <section className={empresaFiltersCollapsed ? `${styles["filters-box"]} ${styles.collapsed}` : styles["filters-box"]}>
                  <header className={styles["filters-box__header"]}>
                    <h3>Empresas</h3>
                    <div className={styles["filters-box__actions"]}>
                      <button
                        type="button"
                        className="panel-icon-btn"
                        onClick={() => setEmpresaFiltersCollapsed((prev) => !prev)}
                        aria-expanded={!empresaFiltersCollapsed}
                        aria-label={empresaFiltersCollapsed ? "Expandir caixa de filtros de empresas" : "Minimizar caixa de filtros de empresas"}
                        title={empresaFiltersCollapsed ? "Expandir" : "Minimizar"}
                      >
                        <span aria-hidden="true">{empresaFiltersCollapsed ? "+" : "-"}</span>
                      </button>
                      <button
                        type="button"
                        className="panel-icon-btn panel-icon-btn--danger"
                        onClick={() => setEmpresaFiltersVisible(false)}
                        aria-label="Fechar caixa de filtros de empresas"
                        title="Fechar"
                      >
                        <span aria-hidden="true">x</span>
                      </button>
                    </div>
                  </header>

                  {!empresaFiltersCollapsed && (
                    <>
                      <label>
                        Setor
                        <select
                          value={filters.setor}
                          onChange={(event) => onFilterChange("setor", event.target.value)}
                          disabled={!empresaBuscaAtiva}
                        >
                          {SETOR_OPTIONS.map((option) => (
                            <option key={option.value || "all"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Porte
                        <select
                          value={filters.porte}
                          onChange={(event) => onFilterChange("porte", event.target.value)}
                          disabled={!empresaBuscaAtiva}
                        >
                          {PORTE_OPTIONS.map((option) => (
                            <option key={option.value || "all"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        CNAE
                        <select
                          value={filters.cnae}
                          onChange={(event) => onFilterChange("cnae", event.target.value)}
                          disabled={!empresaBuscaAtiva}
                        >
                          {cnaeOptions.map((option) => (
                            <option key={option.value || "all"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Município
                        <select
                          value={filters.municipio}
                          onChange={(event) => onFilterChange("municipio", event.target.value)}
                          disabled={!empresaBuscaAtiva}
                        >
                          <option value="">Todos</option>
                          {municipioOptions.map((municipio) => (
                            <option key={municipio} value={municipio}>
                              {municipio}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Situação
                        <select
                          value={filters.situacao}
                          onChange={(event) => onFilterChange("situacao", event.target.value)}
                          disabled={!empresaBuscaAtiva}
                        >
                          {SITUACAO_OPTIONS.map((option) => (
                            <option key={option.value || "all"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <p className="status-info">Marcadores exibidos: {empresas.length}</p>
                    </>
                  )}

                  <footer className={styles["filters-box__footer"]}>
                    <button type="button" className={styles["filters-search-toggle"]} onClick={onToggleEmpresaBusca}>
                      {empresaBuscaAtiva ? "Desativar busca" : "Ativar busca"}
                    </button>
                  </footer>
                </section>
              )}

              {pontosFiltersVisible && (
                <section className={pontosFiltersCollapsed ? `${styles["filters-box"]} ${styles.collapsed}` : styles["filters-box"]}>
                  <header className={styles["filters-box__header"]}>
                    <h3>Pontos Institucionais</h3>
                    <div className={styles["filters-box__actions"]}>
                      <button
                        type="button"
                        className="panel-icon-btn"
                        onClick={() => setPontosFiltersCollapsed((prev) => !prev)}
                        aria-expanded={!pontosFiltersCollapsed}
                        aria-label={pontosFiltersCollapsed ? "Expandir caixa de filtros de pontos institucionais" : "Minimizar caixa de filtros de pontos institucionais"}
                        title={pontosFiltersCollapsed ? "Expandir" : "Minimizar"}
                      >
                        <span aria-hidden="true">{pontosFiltersCollapsed ? "+" : "-"}</span>
                      </button>
                      <button
                        type="button"
                        className="panel-icon-btn panel-icon-btn--danger"
                        onClick={() => setPontosFiltersVisible(false)}
                        aria-label="Fechar caixa de filtros de pontos institucionais"
                        title="Fechar"
                      >
                        <span aria-hidden="true">x</span>
                      </button>
                    </div>
                  </header>

                  {!pontosFiltersCollapsed && (
                    <>
                      <label>
                        Buscar ponto institucional
                        <input
                          type="search"
                          value={pontoFilters.termo}
                          onChange={(event) => onPontoFilterChange("termo", event.target.value)}
                          placeholder="Nome, endereço, contato ou atividade"
                          disabled={!pontosBuscaAtiva}
                        />
                      </label>

                      <label>
                        Tipo de ponto institucional
                        <select
                          value={pontoFilters.tipo}
                          onChange={(event) => onPontoFilterChange("tipo", event.target.value)}
                          disabled={!pontosBuscaAtiva}
                        >
                          {PONTO_INSTITUCIONAL_TIPO_OPTIONS.map((option) => (
                            <option key={option.value || "all"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <p className="status-info">Pontos exibidos: {pontosFiltradosCount}</p>
                    </>
                  )}

                  <footer className={styles["filters-box__footer"]}>
                    <button type="button" className={styles["filters-search-toggle"]} onClick={onTogglePontosBusca}>
                      {pontosBuscaAtiva ? "Desativar busca" : "Ativar busca"}
                    </button>
                  </footer>
                </section>
              )}

              <div className={styles["filters-actions"]}>
                <button type="button" onClick={onClear} disabled={loading}>
                  Limpar
                </button>
              </div>

              {error && <p className="status-error">{error}</p>}
            </div>
          </>
        )}
      </form>
    </aside>
  );
}
