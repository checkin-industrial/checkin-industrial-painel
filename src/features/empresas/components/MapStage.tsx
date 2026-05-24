import { Circle, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import {
  DEFAULT_ZOOM,
  HeatmapLayer,
  type HeatmapPointTuple,
  type LatLngTuple,
  MapFocusTarget,
  MapViewport,
} from "../MapHelpers";
import { useMapContext } from "../useMapContext";
import { EmpresasMarkersLayer } from "./EmpresasMarkersLayer";
import { PontosInstitucionaisMarkersLayer } from "./PontosInstitucionaisMarkersLayer";
import { RouteOverlay } from "./RouteOverlay";
import { UserLocationLayer } from "./UserLocationLayer";

type MapStageProps = {
  center: [number, number];
  isMapFullscreen: boolean;
  mapFocusTarget: LatLngTuple | null;
  loading: boolean;
  heatmapLoading: boolean;
  heatmapPoints: HeatmapPointTuple[];
  analysisCenter: [number, number];
  showRaioAnalise: boolean;
};

// Wrapper do <MapContainer> + camadas. Concentra:
//   - loading overlay (empresas + heatmap)
//   - MapContainer com tile + viewport + focus target
//   - 6 layers: heatmap, circulo raio analise, empresas, pontos, rota, localizacao
//
// As 4 layers no fim (Empresas/Pontos/Route/UserLocation) consomem MapContext;
// as outras precisam de derivados nao expostos no Context, entao chegam via props.
export function MapStage({
  center,
  isMapFullscreen,
  mapFocusTarget,
  loading,
  heatmapLoading,
  heatmapPoints,
  analysisCenter,
  showRaioAnalise,
}: MapStageProps) {
  const { empresas, layerToggles } = useMapContext();

  return (
    <div className="map-wrapper">
      {(loading || heatmapLoading) && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
          <span className="map-loading-label">
            {heatmapLoading && !loading ? "Carregando mapa de calor…" : "Carregando empresas…"}
          </span>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        style={{ height: isMapFullscreen ? "100%" : "calc(100vh - 56px)", width: "100%" }}
      >
        <MapFocusTarget target={mapFocusTarget} />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport empresas={empresas} autoFit={layerToggles.marcadores} />

        {layerToggles.heatmap && <HeatmapLayer points={heatmapPoints} />}

        {showRaioAnalise && (
          <Circle
            center={analysisCenter}
            radius={5000}
            pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.06, weight: 2 }}
          />
        )}

        <EmpresasMarkersLayer />
        <PontosInstitucionaisMarkersLayer />
        <RouteOverlay />
        <UserLocationLayer />
      </MapContainer>
    </div>
  );
}
