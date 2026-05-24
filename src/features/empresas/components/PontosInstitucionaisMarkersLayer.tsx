import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import {
  createPontoInstitucionalMarkerIcon,
  matchesPontoInstitucionalFilters,
} from "../../pontosInstitucionais/markerHelpers";
import { isCoordinateInsideViewportWindow } from "../MapHelpers";
import { useMapContext } from "../useMapContext";

const INITIAL_PONTO_FILTERS = { termo: "", tipo: "" };

// Camada de markers dos Pontos Institucionais. Aplica viewport-window +
// filtros (termo, tipo) lado do cliente. Renderiza apenas se
// layerToggles.pontosInstitucionais.
export function PontosInstitucionaisMarkersLayer() {
  const ctx = useMapContext();
  const {
    pontosInstitucionais,
    pontoFilters,
    pontosBuscaAtiva,
    selectedPontoInstitucionalId,
    setSelectedEmpresaId,
    setSelectedPontoInstitucionalId,
    layerToggles,
    setPanelsVisible,
    setReportCollapsed,
  } = ctx;

  const visiveisFiltrados = useMemo(
    () =>
      pontosInstitucionais
        .filter((ponto) => isCoordinateInsideViewportWindow(ponto.latitude, ponto.longitude))
        .filter((ponto) =>
          matchesPontoInstitucionalFilters(
            ponto,
            pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
          ),
        ),
    [pontosInstitucionais, pontoFilters, pontosBuscaAtiva],
  );

  if (!layerToggles.pontosInstitucionais) {
    return null;
  }

  return (
    <>
      {visiveisFiltrados.map((ponto) => (
        <Marker
          key={ponto.id}
          position={[ponto.latitude, ponto.longitude]}
          icon={createPontoInstitucionalMarkerIcon(
            ponto,
            ponto.id === selectedPontoInstitucionalId,
            layerToggles.rotulosEmpresas || ponto.id === selectedPontoInstitucionalId,
          )}
          eventHandlers={{
            click: () => {
              setSelectedPontoInstitucionalId(ponto.id);
              setSelectedEmpresaId(null);
              setReportCollapsed(false);
              setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <div>
              <strong>{ponto.nome}</strong>
              <br />
              <strong>Atividade:</strong>{" "}
              {ponto.atividadesDisponiveis || ponto.descricao || "Não informada"}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
