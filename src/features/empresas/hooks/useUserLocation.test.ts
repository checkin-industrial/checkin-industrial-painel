import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserLocation } from "./useUserLocation";

type GeoSuccess = (position: GeolocationPosition) => void;
type GeoError = (error: GeolocationPositionError) => void;

describe("useUserLocation", () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCurrentPosition = vi.fn();
    Object.defineProperty(globalThis.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("estado inicial: userLocation null, locationActive false", () => {
    const { result } = renderHook(() => useUserLocation());
    expect(result.current.userLocation).toBe(null);
    expect(result.current.locationActive).toBe(false);
  });

  it("toggleUserLocation off->on chama requestUserLocation -> set userLocation no success", () => {
    getCurrentPosition.mockImplementation((onSuccess: GeoSuccess) => {
      onSuccess({
        coords: {
          latitude: -22.3,
          longitude: -49.05,
          accuracy: 1,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON() {
            return {};
          },
        },
        timestamp: Date.now(),
        toJSON() {
          return {};
        },
      } as GeolocationPosition);
    });

    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.toggleUserLocation());

    expect(result.current.locationActive).toBe(true);
    expect(result.current.userLocation).toEqual({ latitude: -22.3, longitude: -49.05 });
  });

  it("on->off limpa userLocation + locationActive", () => {
    getCurrentPosition.mockImplementation((onSuccess: GeoSuccess) => {
      onSuccess({
        coords: { latitude: 1, longitude: 2, accuracy: 1, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON() { return {}; } },
        timestamp: 0,
        toJSON() { return {}; },
      } as GeolocationPosition);
    });

    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.toggleUserLocation()); // on
    act(() => result.current.toggleUserLocation()); // off

    expect(result.current.locationActive).toBe(false);
    expect(result.current.userLocation).toBe(null);
  });

  it("error callback: zera locationActive e alerta", () => {
    getCurrentPosition.mockImplementation((_onSuccess: GeoSuccess, onError?: GeoError) => {
      onError?.({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    });

    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.toggleUserLocation());

    expect(result.current.locationActive).toBe(false);
    expect(globalThis.alert).toHaveBeenCalled();
  });

  it("se navigator.geolocation indisponivel, requestUserLocation alerta e nao crasha", () => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useUserLocation());
    act(() => result.current.requestUserLocation());
    expect(globalThis.alert).toHaveBeenCalled();
    expect(result.current.locationActive).toBe(false);
  });
});
