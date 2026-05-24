import { useMapContext } from "../useMapContext";
import type { LayerToggleState } from "../types";
import styles from "./MapLegend.module.css";

// Barra de toggles na borda do mapa: heatmap, marcadores, raio, rotulos,
// pontos institucionais, localizacao, rota, fullscreen, paineis. Handlers
// que mexem em side effects de mapa (toggleLayer, toggleUserLocation,
// handleToggleFullscreen, toggleFiltersPanel) ficam no container e chegam
// via props - o componente continua "burro" focado em layout.
type MapLegendProps = {
  isMapFullscreen: boolean;
  onToggleLayer: (layer: keyof LayerToggleState) => void;
  onToggleUserLocation: () => void;
  onToggleFullscreen: () => void;
  onToggleFiltersPanel: () => void;
};

// Helper: gera className do botao toggle padrao (sempre 3 classes locais:
// legend-item + legend-toggle + icon-only, mais opcional active).
function toggleClass(active: boolean): string {
  const base = `${styles["legend-item"]} ${styles["legend-toggle"]} ${styles["icon-only"]}`;
  return active ? `${base} ${styles.active}` : base;
}

// Helper: gera className do quadrado colorido do icone (legend-color +
// variante: heat / marker / radius / etc.).
function colorClass(variant: string): string {
  return `${styles["legend-color"]} ${styles[variant]}`;
}

export function MapLegend({
  isMapFullscreen,
  onToggleLayer,
  onToggleUserLocation,
  onToggleFullscreen,
  onToggleFiltersPanel,
}: MapLegendProps) {
  const {
    layerToggles,
    locationActive,
    routeEnabled,
    setRouteEnabled,
    panelsVisible,
    setPanelsVisible,
  } = useMapContext();

  return (
    <div className={styles["map-legend"]}>
      <button
        type="button"
        className={toggleClass(layerToggles.heatmap)}
        onClick={() => onToggleLayer("heatmap")}
        aria-pressed={layerToggles.heatmap}
        aria-label="Mapa de Calor - Densidade de Empresas"
        title="Mapa de Calor: visualiza a densidade e concentração de empresas na região"
      >
        <i className={colorClass("heat")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(layerToggles.marcadores)}
        onClick={() => onToggleLayer("marcadores")}
        aria-pressed={layerToggles.marcadores}
        aria-label="Marcadores de Empresas - Localização Exata"
        title="Marcadores: exibe a localização de cada empresa no mapa"
      >
        <i className={colorClass("marker")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(layerToggles.raioAnalise)}
        onClick={() => onToggleLayer("raioAnalise")}
        aria-pressed={layerToggles.raioAnalise}
        aria-label="Raio de Análise - 5km ao Redor"
        title="Raio de Análise: desenha um círculo de 5km ao redor de uma empresa selecionada"
      >
        <i className={colorClass("radius")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(layerToggles.rotulosEmpresas)}
        onClick={() => onToggleLayer("rotulosEmpresas")}
        aria-pressed={layerToggles.rotulosEmpresas}
        aria-label="Rótulos de Nomes"
        disabled={!layerToggles.marcadores && !layerToggles.pontosInstitucionais}
        title={
          !layerToggles.marcadores && !layerToggles.pontosInstitucionais
            ? "Ative marcadores ou pontos institucionais primeiro para exibir rótulos"
            : "Rótulos: mostra os nomes das empresas e pontos turísticos no mapa"
        }
      >
        <i className={colorClass("label")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(layerToggles.pontosInstitucionais)}
        onClick={() => onToggleLayer("pontosInstitucionais")}
        aria-pressed={layerToggles.pontosInstitucionais}
        aria-label="Pontos Institucionais e Turísticos"
        title="Pontos Turísticos: exibe hotéis, atrativos, educação e outros pontos úteis"
      >
        <i className={colorClass("institutional")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(locationActive)}
        onClick={onToggleUserLocation}
        aria-pressed={locationActive}
        aria-label="Minha Localização - Ativar GPS"
        title="Localização: permite visualizar sua posição atual no mapa e traçar rotas"
      >
        <i className={colorClass("location")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(routeEnabled)}
        onClick={() => setRouteEnabled((prev) => !prev)}
        aria-pressed={routeEnabled}
        aria-label="Traçar Rota - Direcionamento"
        title="Rota: calcula e desenha o trajeto de sua localização até o destino selecionado"
      >
        <i className={colorClass("route")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(isMapFullscreen)}
        onClick={onToggleFullscreen}
        aria-pressed={isMapFullscreen}
        aria-label={isMapFullscreen ? "Sair de Tela Cheia" : "Tela Cheia"}
        title={isMapFullscreen ? "Clique para sair do modo tela cheia" : "Clique para ampliar o mapa em tela cheia"}
      >
        <i className={colorClass("fullscreen")} aria-hidden="true" />
      </button>

      <div className={styles["legend-separator"]} />
      <button
        type="button"
        className={toggleClass(panelsVisible.filtros)}
        onClick={onToggleFiltersPanel}
        aria-pressed={panelsVisible.filtros}
        aria-label={panelsVisible.filtros ? "Fechar Painel de Filtros" : "Abrir Painel de Filtros"}
        title={panelsVisible.filtros ? "Filtros: clique para fechar o painel de filtros avançados" : "Filtros: clique para abrir o painel de filtros avançados (nome, setor, porte, etc)"}
      >
        <i className={colorClass("filters")} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={toggleClass(panelsVisible.relatorio)}
        onClick={() => setPanelsVisible((prev) => ({ ...prev, relatorio: !prev.relatorio }))}
        aria-pressed={panelsVisible.relatorio}
        aria-label={panelsVisible.relatorio ? "Fechar Relatório da Vizinhança" : "Abrir Relatório da Vizinhança"}
        title={panelsVisible.relatorio ? "Relatório: clique para fechar o painel de análise e detalhes" : "Relatório: clique para abrir o painel de análise da vizinhança"}
      >
        <i className={colorClass("report")} aria-hidden="true" />
      </button>
    </div>
  );
}
