import { Polyline } from "react-leaflet";
import { useMapContext } from "../useMapContext";

// Polyline da rota calculada via OSRM (useRouteOSRM). Renderiza apenas
// quando o usuario habilitou rota (routeEnabled) E o calculo retornou
// pelo menos 2 pontos.
export function RouteOverlay() {
  const { routeEnabled, routePath } = useMapContext();

  if (!routeEnabled || routePath.length <= 1) {
    return null;
  }

  return (
    <Polyline
      positions={routePath}
      pathOptions={{
        color: "#1d4ed8",
        weight: 4,
        opacity: 0.85,
      }}
    />
  );
}
