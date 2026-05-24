import { useCallback, useEffect, useRef, useState } from "react";

// Hook que gerencia o estado fullscreen do <div className="map-stage">.
// Expoe a ref pra anchorar no DOM + flag isMapFullscreen + handler para
// alternar. Sincroniza com fullscreenchange nativo do browser pra detectar
// o Esc (que sai do fullscreen sem nosso handler ser chamado).
export function useMapFullscreen() {
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsMapFullscreen(document.fullscreenElement === mapStageRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement === mapStageRef.current) {
        await document.exitFullscreen();
        return;
      }

      if (mapStageRef.current?.requestFullscreen) {
        await mapStageRef.current.requestFullscreen();
      }
    } catch {
      // Fallback otimista quando a Fullscreen API falha (ex: iframe sem
      // allowfullscreen): flipa o flag pra renderizar como "fullscreen
      // logico" via CSS. Sem o cleanup do fullscreenchange-listener nesse
      // caminho, a saida fica por conta do proprio toggle.
      setIsMapFullscreen((prev) => !prev);
    }
  }, []);

  return {
    mapStageRef,
    isMapFullscreen,
    handleToggleFullscreen,
  };
}
