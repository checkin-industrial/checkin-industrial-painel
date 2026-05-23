/* eslint-disable react-refresh/only-export-components -- mistura intencional: helpers
 * (constants, types, function utils) e sub-componentes Leaflet headless convivem no
 * mesmo arquivo. Custo de fast-refresh aceitavel; quebrar em N arquivos seria pior. */
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

/**
 * Sub-componentes Leaflet "headless" (sem render proprio - so efeitos no mapa via useMap).
 * Usados dentro do <MapContainer> em EmpresasFilterMapExample.
 *
 * - MapViewport: ajusta viewport pra cobrir o conjunto de empresas (ou centro padrao)
 * - MapFocusTarget: anima fly-to quando target muda
 * - HeatmapLayer: gerencia a heat layer (leaflet.heat) em funcao do zoom
 */

// ─── tipos / constantes ─────────────────────────────────────────────────────

export type LatLngTuple = [number, number];
export type HeatmapPointTuple = [number, number, number]; // [lat, lng, intensity]

export type LeafletHeatLayer = L.Layer & {
  setOptions: (options: Record<string, unknown>) => void;
  redraw: () => void;
};

export type EmpresaCoord = {
  latitude: number;
  longitude: number;
};

export const DEFAULT_CENTER: [number, number] = [-22.602177, -48.800792];
export const DEFAULT_ZOOM = 14;

// Janela geografica de seguranca para evitar fitBounds global por dados ruins.
export const MAP_BOUNDS = {
  minLat: -24.5,
  maxLat: -21.0,
  minLng: -50.5,
  maxLng: -47.0,
};

export function isCoordinateInsideViewportWindow(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= MAP_BOUNDS.minLat &&
    latitude <= MAP_BOUNDS.maxLat &&
    longitude >= MAP_BOUNDS.minLng &&
    longitude <= MAP_BOUNDS.maxLng
  );
}

// ─── MapViewport ────────────────────────────────────────────────────────────

export function MapViewport({ empresas, autoFit }: { empresas: EmpresaCoord[]; autoFit: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!autoFit) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const validEmpresas = empresas.filter((e) => isCoordinateInsideViewportWindow(e.latitude, e.longitude));

    if (validEmpresas.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (validEmpresas.length === 1) {
      map.setView([validEmpresas[0].latitude, validEmpresas[0].longitude], 14);
      return;
    }

    const bounds = validEmpresas.map((e) => [e.latitude, e.longitude] as [number, number]);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [autoFit, empresas, map]);

  return null;
}

// ─── MapFocusTarget ─────────────────────────────────────────────────────────

export function MapFocusTarget({ target }: { target: LatLngTuple | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }
    map.flyTo(target, Math.max(map.getZoom(), 16), { animate: true, duration: 0.8 });
  }, [map, target]);

  return null;
}

// ─── HeatmapLayer ───────────────────────────────────────────────────────────

const HEATMAP_MAX_VISIBLE_ZOOM = 15;

function buildHeatOptionsByZoom(zoom: number) {
  const clampedZoom = Math.min(18, Math.max(11, zoom));
  const radius = Math.round(20 + (clampedZoom - 11) * 1.2);
  const blur = Math.round(16 + (clampedZoom - 11) * 0.9);
  const intensityMaxZoom = Math.max(15, clampedZoom);

  return {
    radius,
    blur,
    maxZoom: intensityMaxZoom,
    minOpacity: 0.3,
    gradient: {
      0.2: "#0ea5e9",
      0.4: "#22c55e",
      0.6: "#facc15",
      0.8: "#f97316",
      1.0: "#dc2626",
    },
  };
}

export function HeatmapLayer({ points }: { points: HeatmapPointTuple[] }) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (points.length === 0) {
      return;
    }

    const heatFactory = (
      L as unknown as {
        heatLayer: (latlngs: HeatmapPointTuple[], options?: Record<string, unknown>) => L.Layer;
      }
    ).heatLayer;

    const initialOptions = buildHeatOptionsByZoom(map.getZoom());
    const heatLayer = heatFactory(points, initialOptions) as LeafletHeatLayer;

    const applyZoomHeatOptions = () => {
      const currentZoom = map.getZoom();
      const shouldShowHeatmap = currentZoom <= HEATMAP_MAX_VISIBLE_ZOOM;

      if (!shouldShowHeatmap) {
        if (map.hasLayer(heatLayer)) {
          map.removeLayer(heatLayer);
        }
        return;
      }

      if (!map.hasLayer(heatLayer)) {
        heatLayer.addTo(map);
      }

      const nextOptions = buildHeatOptionsByZoom(currentZoom);
      heatLayer.setOptions(nextOptions);
      heatLayer.redraw();
    };

    applyZoomHeatOptions();
    heatLayerRef.current = heatLayer;
    map.on("zoomend", applyZoomHeatOptions);

    return () => {
      map.off("zoomend", applyZoomHeatOptions);
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}
