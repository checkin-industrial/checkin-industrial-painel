import { useEffect, useState } from "react";
import type { LatLngTuple } from "../MapHelpers";

// Hook que isola o calculo de rota via OSRM (router.project-osrm.org).
// Recebe origem (userLocation) + destino (rotaDestino) + flag de ativacao
// e gerencia routePath/routeLoading/routeError/routeInfo. Cancela fetch
// pendente quando inputs mudam ou unmount.
//
// Validacao de pre-condicoes (userLocation/destino ausente) emite mensagem
// pelo routeError. Container apenas exibe.

type UserLocationInput = { latitude: number; longitude: number } | null;

type RouteInfo = { distanceKm: number; durationMin: number };

type UseRouteOSRMArgs = {
  routeEnabled: boolean;
  userLocation: UserLocationInput;
  locationActive: boolean;
  destino: LatLngTuple | null;
};

export function useRouteOSRM({
  routeEnabled,
  userLocation,
  locationActive,
  destino,
}: UseRouteOSRMArgs) {
  const [routePath, setRoutePath] = useState<LatLngTuple[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  useEffect(() => {
    if (!routeEnabled) {
      setRouteLoading(false);
      setRouteError(null);
      setRoutePath([]);
      setRouteInfo(null);
      return;
    }

    if (!locationActive || !userLocation) {
      setRouteLoading(false);
      setRoutePath([]);
      setRouteInfo(null);
      setRouteError("Ative sua localização para calcular a rota.");
      return;
    }

    if (!destino) {
      setRouteLoading(false);
      setRoutePath([]);
      setRouteInfo(null);
      setRouteError("Selecione um ponto no mapa para traçar a rota.");
      return;
    }

    const origemAtual = userLocation;
    const destinoAtual = destino;

    let cancelled = false;

    async function fetchRoute() {
      setRouteLoading(true);
      setRouteError(null);

      try {
        const [origemLat, origemLng] = [origemAtual.latitude, origemAtual.longitude];
        const [destinoLat, destinoLng] = destinoAtual;
        const endpoint = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson&steps=false`;
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Falha ao calcular rota (${response.status})`);
        }

        const data = (await response.json()) as {
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: { coordinates: Array<[number, number]> };
          }>;
        };

        const route = data.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          throw new Error("Rota indisponível para o destino selecionado.");
        }

        if (!cancelled) {
          const coordinates = route.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] as LatLngTuple,
          );

          setRoutePath(coordinates);
          setRouteInfo({
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setRoutePath([]);
          setRouteInfo(null);
          setRouteError(err instanceof Error ? err.message : "Não foi possível calcular a rota.");
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    }

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [locationActive, routeEnabled, destino, userLocation]);

  return {
    routePath,
    setRoutePath,
    routeLoading,
    setRouteLoading,
    routeError,
    setRouteError,
    routeInfo,
    setRouteInfo,
  };
}

export type { RouteInfo };
