import { useContext } from "react";
import { MapContext, type MapContextValue } from "./MapContext";

// Hook customizado: assert nao-null + erro claro caso o consumer esteja fora
// do Provider. Mora em arquivo separado pra Fast Refresh (HMR) funcionar -
// React Refresh exige que arquivos exportando componentes/Context.Provider
// nao exportem tambem funcoes nao-componente.
export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (ctx === null) {
    throw new Error("useMapContext deve ser chamado dentro de <MapContextProvider>.");
  }
  return ctx;
}
