import { useQuery } from "@tanstack/react-query";
import type { LatLngTuple } from "../MapHelpers";

// Hook que isola o calculo de rota via OSRM (router.project-osrm.org) sobre
// TanStack Query. queryKey baseada em origem+destino da cache + dedup, e o
// AbortSignal do useQuery cuida da cancellation quando os inputs mudam ou
// o componente desmonta.
//
// routeError e derivado: pre-condicoes (sem localizacao/destino) tem precedencia
// sobre erros de fetch. Container nao precisa mais setar erro manualmente -
// basta ligar routeEnabled e o hook calcula o resto.

type UserLocationInput = { latitude: number; longitude: number } | null;

type RouteInfo = { distanceKm: number; durationMin: number };

type UseRouteOSRMArgs = {
  routeEnabled: boolean;
  userLocation: UserLocationInput;
  locationActive: boolean;
  destino: LatLngTuple | null;
};

type RouteResult = {
  path: LatLngTuple[];
  info: RouteInfo;
};

export function useRouteOSRM({
  routeEnabled,
  userLocation,
  locationActive,
  destino,
}: UseRouteOSRMArgs) {
  const ready = routeEnabled && locationActive && !!userLocation && !!destino;

  const {
    data,
    isFetching: routeLoading,
    error: queryError,
  } = useQuery<RouteResult>({
    queryKey: [
      "route-osrm",
      userLocation?.latitude,
      userLocation?.longitude,
      destino?.[0],
      destino?.[1],
    ],
    enabled: ready,
    // Rotas mudam pouco pra mesmo par origem/destino - vale o stale time alto.
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      // ready=true garante o nao-nulo, mas TS nao infere isso atraves de useQuery enabled.
      const origem = userLocation!;
      const [destinoLat, destinoLng] = destino!;
      const endpoint = `https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};${destinoLng},${destinoLat}?overview=full&geometries=geojson&steps=false`;

      const response = await fetch(endpoint, { signal });
      if (!response.ok) {
        throw new Error(`Falha ao calcular rota (${response.status})`);
      }

      const payload = (await response.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: Array<[number, number]> };
        }>;
      };

      const route = payload.routes?.[0];
      if (!route?.geometry?.coordinates?.length) {
        throw new Error("Rota indisponível para o destino selecionado.");
      }

      const path = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as LatLngTuple,
      );

      return {
        path,
        info: { distanceKm: route.distance / 1000, durationMin: route.duration / 60 },
      };
    },
  });

  const routePath = data?.path ?? [];
  const routeInfo = data?.info ?? null;

  // Erros de pre-condicao tem precedencia (usuario nao habilitou localizacao,
  // ou nao selecionou destino) - mensagens estaveis. Caso pre-condicoes ok,
  // expoe a mensagem do fetch.
  let routeError: string | null = null;
  if (routeEnabled) {
    if (!locationActive || !userLocation) {
      routeError = "Ative sua localização para calcular a rota.";
    } else if (!destino) {
      routeError = "Selecione um ponto no mapa para traçar a rota.";
    } else if (queryError instanceof Error) {
      routeError = queryError.message;
    }
  }

  return {
    routePath,
    routeLoading: ready && routeLoading,
    routeError,
    routeInfo,
  };
}

export type { RouteInfo };
