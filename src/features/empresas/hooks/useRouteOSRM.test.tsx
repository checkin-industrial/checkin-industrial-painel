import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteOSRM } from "./useRouteOSRM";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const USER_LOC = { latitude: -22.3, longitude: -49.05 };
const DESTINO: [number, number] = [-22.4, -49.1];

describe("useRouteOSRM", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("routeEnabled=false: nao chama fetch, sem erro", () => {
    const { result } = renderHook(
      () =>
        useRouteOSRM({
          routeEnabled: false,
          userLocation: USER_LOC,
          locationActive: true,
          destino: DESTINO,
        }),
      { wrapper: makeWrapper() },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.routeError).toBe(null);
  });

  it("routeEnabled=true sem localizacao ativa: routeError pre-condicao", () => {
    const { result } = renderHook(
      () =>
        useRouteOSRM({
          routeEnabled: true,
          userLocation: null,
          locationActive: false,
          destino: DESTINO,
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.routeError).toBe("Ative sua localização para calcular a rota.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routeEnabled=true sem destino: routeError pre-condicao", () => {
    const { result } = renderHook(
      () =>
        useRouteOSRM({
          routeEnabled: true,
          userLocation: USER_LOC,
          locationActive: true,
          destino: null,
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.routeError).toBe("Selecione um ponto no mapa para traçar a rota.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ok: chama OSRM, popula routePath + routeInfo (distance/duration)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          routes: [
            {
              distance: 2000,
              duration: 600,
              geometry: { coordinates: [[-49.05, -22.3], [-49.1, -22.4]] },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(
      () =>
        useRouteOSRM({
          routeEnabled: true,
          userLocation: USER_LOC,
          locationActive: true,
          destino: DESTINO,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.routePath.length).toBe(2));
    expect(result.current.routePath).toEqual([
      [-22.3, -49.05],
      [-22.4, -49.1],
    ]);
    expect(result.current.routeInfo).toEqual({ distanceKm: 2, durationMin: 10 });
    expect(result.current.routeError).toBe(null);
  });

  it("OSRM 500: routeError mostra mensagem do fetch", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));

    const { result } = renderHook(
      () =>
        useRouteOSRM({
          routeEnabled: true,
          userLocation: USER_LOC,
          locationActive: true,
          destino: DESTINO,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.routeError).not.toBe(null));
    expect(result.current.routeError).toContain("500");
  });

  it("OSRM sem rotas: routeError indica indisponivel", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ routes: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(
      () =>
        useRouteOSRM({
          routeEnabled: true,
          userLocation: USER_LOC,
          locationActive: true,
          destino: DESTINO,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.routeError).not.toBe(null));
    expect(result.current.routeError).toMatch(/indispon/i);
  });
});
