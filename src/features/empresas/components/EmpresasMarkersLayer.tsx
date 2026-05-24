import { Marker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { createEmpresaMarkerIcon } from "../EmpresaMarker";
import { isCoordinateInsideViewportWindow } from "../MapHelpers";
import { useMapContext } from "../useMapContext";

// Acima desse N de markers visiveis, agrupa em clusters automaticamente.
// Limite empirico (mecanica-hermes degradou em ~200 markers visiveis).
const CLUSTER_THRESHOLD = 200;

// Camada de markers das empresas no mapa publico. Renderiza um Marker por
// empresa visivel no viewport; agrupa em MarkerClusterGroup quando passa
// CLUSTER_THRESHOLD pra preservar performance/legibilidade.
//
// State + handlers vem do MapContext; renderiza apenas se layerToggles.marcadores.
export function EmpresasMarkersLayer() {
  const ctx = useMapContext();
  const {
    empresas,
    selectedEmpresaId,
    setSelectedEmpresaId,
    setSelectedPontoInstitucionalId,
    layerToggles,
    panelsVisible,
    setPanelsVisible,
    setReportCollapsed,
  } = ctx;

  if (!layerToggles.marcadores) {
    return null;
  }

  const visiveis = empresas.filter((empresa) =>
    isCoordinateInsideViewportWindow(empresa.latitude, empresa.longitude),
  );

  const markers = visiveis.map((empresa) => (
    <Marker
      key={empresa.id}
      position={[empresa.latitude, empresa.longitude]}
      icon={createEmpresaMarkerIcon(
        empresa.setor,
        empresa.id === selectedEmpresaId,
        empresa.nomeFantasia,
        layerToggles.rotulosEmpresas || empresa.id === selectedEmpresaId,
      )}
      eventHandlers={{
        click: () => {
          if (selectedEmpresaId === empresa.id) {
            if (!panelsVisible.relatorio) {
              setReportCollapsed(false);
              setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
              return;
            }

            setSelectedEmpresaId(null);
            return;
          }

          setSelectedEmpresaId(empresa.id);
          setSelectedPontoInstitucionalId(null);
          setReportCollapsed(false);
          setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        <div>
          <strong>{empresa.nomeFantasia}</strong>
          <br />
          <strong>Atividade:</strong> {empresa.descricaoCnae || empresa.cnaePrincipal}
        </div>
      </Tooltip>
    </Marker>
  ));

  return visiveis.length > CLUSTER_THRESHOLD ? (
    <MarkerClusterGroup chunkedLoading>{markers}</MarkerClusterGroup>
  ) : (
    <>{markers}</>
  );
}
