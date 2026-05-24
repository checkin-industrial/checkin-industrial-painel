import { useCallback, useState } from "react";

// Hook que encapsula geolocation API + state local (userLocation + flag ativa).
// Container consome via {userLocation, locationActive, toggleUserLocation} sem
// se preocupar com permission/error handling.
//
// Cleanup de rota e responsabilidade do useRouteOSRM (que reage a
// locationActive=false zerando path/info via effect).

type UserLocation = { latitude: number; longitude: number };

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationActive, setLocationActive] = useState(false);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setLocationActive(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        alert("Não foi possível obter sua localização. Verifique as permissões.");
        setLocationActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  const toggleUserLocation = useCallback(() => {
    if (locationActive) {
      setLocationActive(false);
      setUserLocation(null);
    } else {
      requestUserLocation();
    }
  }, [locationActive, requestUserLocation]);

  return {
    userLocation,
    setUserLocation,
    locationActive,
    setLocationActive,
    requestUserLocation,
    toggleUserLocation,
  };
}

export type { UserLocation };
