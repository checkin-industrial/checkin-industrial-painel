import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { EmpresaMarker, type EmpresaMapItem } from "./EmpresaMarker";

type EmpresasMapProps = {
  apiBaseUrl?: string;
  height?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
};

const DEFAULT_CENTER: [number, number] = [-22.6, -48.8];
const DEFAULT_ZOOM = 12;

export function EmpresasMap({
  apiBaseUrl = "",
  height = "520px",
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
}: EmpresasMapProps) {
  const {
    data: empresas = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["empresas", "map-simple", apiBaseUrl],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/api/empresas`);
      if (!response.ok) {
        throw new Error(`Falha ao carregar empresas (${response.status})`);
      }
      const data = (await response.json()) as EmpresaMapItem[];
      return Array.isArray(data) ? data : [];
    },
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const center = useMemo<[number, number]>(() => {
    if (empresas.length === 0) {
      return initialCenter;
    }

    const mediaLatitude = empresas.reduce((acc, item) => acc + item.latitude, 0) / empresas.length;
    const mediaLongitude = empresas.reduce((acc, item) => acc + item.longitude, 0) / empresas.length;

    return [mediaLatitude, mediaLongitude];
  }, [empresas, initialCenter]);

  if (loading) {
    return <p>Carregando empresas no mapa...</p>;
  }

  if (error) {
    return <p>Erro ao carregar mapa: {error}</p>;
  }

  return (
    <MapContainer center={center} zoom={initialZoom} style={{ height, width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {empresas.map((empresa) => (
        <EmpresaMarker key={empresa.id} empresa={empresa} />
      ))}
    </MapContainer>
  );
}
