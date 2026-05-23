import { useEffect, useMemo, useState } from "react";
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
  const [empresas, setEmpresas] = useState<EmpresaMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function carregarEmpresas() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiBaseUrl}/api/empresas`);
        if (!response.ok) {
          throw new Error(`Falha ao carregar empresas (${response.status})`);
        }

        const data: EmpresaMapItem[] = await response.json();

        if (isMounted) {
          setEmpresas(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar mapa.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    carregarEmpresas();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

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
