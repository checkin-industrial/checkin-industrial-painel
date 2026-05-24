import { useMapContext } from "../useMapContext";
import type { LayerToggleState } from "../types";

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
    <div className="map-legend">
      <button
        type="button"
        className={layerToggles.heatmap ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={() => onToggleLayer("heatmap")}
        aria-pressed={layerToggles.heatmap}
        aria-label="Mapa de Calor - Densidade de Empresas"
        title="Mapa de Calor: visualiza a densidade e concentração de empresas na região"
      >
        <i className="legend-color heat" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={layerToggles.marcadores ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={() => onToggleLayer("marcadores")}
        aria-pressed={layerToggles.marcadores}
        aria-label="Marcadores de Empresas - Localização Exata"
        title="Marcadores: exibe a localização de cada empresa no mapa"
      >
        <i className="legend-color marker" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={layerToggles.raioAnalise ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={() => onToggleLayer("raioAnalise")}
        aria-pressed={layerToggles.raioAnalise}
        aria-label="Raio de Análise - 5km ao Redor"
        title="Raio de Análise: desenha um círculo de 5km ao redor de uma empresa selecionada"
      >
        <i className="legend-color radius" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={layerToggles.rotulosEmpresas ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
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
        <i className="legend-color label" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={layerToggles.pontosInstitucionais ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={() => onToggleLayer("pontosInstitucionais")}
        aria-pressed={layerToggles.pontosInstitucionais}
        aria-label="Pontos Institucionais e Turísticos"
        title="Pontos Turísticos: exibe hotéis, atrativos, educação e outros pontos úteis"
      >
        <i className="legend-color institutional" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={locationActive ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={onToggleUserLocation}
        aria-pressed={locationActive}
        aria-label="Minha Localização - Ativar GPS"
        title="Localização: permite visualizar sua posição atual no mapa e traçar rotas"
      >
        <i className="legend-color location" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={routeEnabled ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={() => setRouteEnabled((prev) => !prev)}
        aria-pressed={routeEnabled}
        aria-label="Traçar Rota - Direcionamento"
        title="Rota: calcula e desenha o trajeto de sua localização até o destino selecionado"
      >
        <i className="legend-color route" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={isMapFullscreen ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={onToggleFullscreen}
        aria-pressed={isMapFullscreen}
        aria-label={isMapFullscreen ? "Sair de Tela Cheia" : "Tela Cheia"}
        title={isMapFullscreen ? "Clique para sair do modo tela cheia" : "Clique para ampliar o mapa em tela cheia"}
      >
        <i className="legend-color fullscreen" aria-hidden="true" />
      </button>

      <div className="legend-separator" />
      <button
        type="button"
        className={panelsVisible.filtros ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={onToggleFiltersPanel}
        aria-pressed={panelsVisible.filtros}
        aria-label={panelsVisible.filtros ? "Fechar Painel de Filtros" : "Abrir Painel de Filtros"}
        title={panelsVisible.filtros ? "Filtros: clique para fechar o painel de filtros avançados" : "Filtros: clique para abrir o painel de filtros avançados (nome, setor, porte, etc)"}
      >
        <i className="legend-color filters" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={panelsVisible.relatorio ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
        onClick={() => setPanelsVisible((prev) => ({ ...prev, relatorio: !prev.relatorio }))}
        aria-pressed={panelsVisible.relatorio}
        aria-label={panelsVisible.relatorio ? "Fechar Relatório da Vizinhança" : "Abrir Relatório da Vizinhança"}
        title={panelsVisible.relatorio ? "Relatório: clique para fechar o painel de análise e detalhes" : "Relatório: clique para abrir o painel de análise da vizinhança"}
      >
        <i className="legend-color report" aria-hidden="true" />
      </button>
    </div>
  );
}
