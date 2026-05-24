import L from "leaflet";
import { Circle, Marker, Tooltip } from "react-leaflet";
import { useMapContext } from "../useMapContext";

// Marcador + circulo de precisao da localizacao do usuario. Renderiza
// somente quando o usuario ativou a geolocation (locationActive=true) e
// ja recebeu uma posicao (userLocation nao-null).
export function UserLocationLayer() {
  const { userLocation, locationActive } = useMapContext();

  if (!locationActive || !userLocation) {
    return null;
  }

  return (
    <>
      <Circle
        center={[userLocation.latitude, userLocation.longitude]}
        radius={220}
        pathOptions={{
          color: "#2563eb",
          fillColor: "#60a5fa",
          fillOpacity: 0.18,
          weight: 2,
        }}
      />
      <Marker
        position={[userLocation.latitude, userLocation.longitude]}
        icon={L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        })}
      >
        <Tooltip direction="top" offset={[0, -10]}>
          <div>
            <strong>Sua localização</strong>
            <br />
            <small>Latitude: {userLocation.latitude.toFixed(5)}</small>
            <br />
            <small>Longitude: {userLocation.longitude.toFixed(5)}</small>
          </div>
        </Tooltip>
      </Marker>
    </>
  );
}
