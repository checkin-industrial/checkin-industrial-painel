import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMapFullscreen } from "./useMapFullscreen";

describe("useMapFullscreen", () => {
  beforeEach(() => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inicia com isMapFullscreen=false + mapStageRef null", () => {
    const { result } = renderHook(() => useMapFullscreen());
    expect(result.current.isMapFullscreen).toBe(false);
    expect(result.current.mapStageRef.current).toBe(null);
  });

  it("handleToggleFullscreen chama requestFullscreen no ref", async () => {
    const { result } = renderHook(() => useMapFullscreen());
    const fakeDiv = document.createElement("div");
    const requestFs = vi.fn().mockResolvedValue(undefined);
    (fakeDiv as unknown as { requestFullscreen: typeof requestFs }).requestFullscreen = requestFs;
    result.current.mapStageRef.current = fakeDiv;

    await act(async () => {
      await result.current.handleToggleFullscreen();
    });

    expect(requestFs).toHaveBeenCalledOnce();
  });

  it("handleToggleFullscreen chama exitFullscreen quando ja em fullscreen", async () => {
    const { result } = renderHook(() => useMapFullscreen());
    const fakeDiv = document.createElement("div");
    result.current.mapStageRef.current = fakeDiv;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fakeDiv,
    });
    const exitFs = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFs,
    });

    await act(async () => {
      await result.current.handleToggleFullscreen();
    });

    expect(exitFs).toHaveBeenCalledOnce();
  });

  it("fallback otimista: se requestFullscreen rejeitar, flipa o flag", async () => {
    const { result } = renderHook(() => useMapFullscreen());
    const fakeDiv = document.createElement("div");
    (fakeDiv as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = () =>
      Promise.reject(new Error("not allowed"));
    result.current.mapStageRef.current = fakeDiv;

    await act(async () => {
      await result.current.handleToggleFullscreen();
    });

    expect(result.current.isMapFullscreen).toBe(true);
  });

  it("evento fullscreenchange sincroniza isMapFullscreen com document.fullscreenElement === ref", () => {
    const { result } = renderHook(() => useMapFullscreen());
    const fakeDiv = document.createElement("div");
    result.current.mapStageRef.current = fakeDiv;

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fakeDiv,
    });

    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.isMapFullscreen).toBe(true);

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });

    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.isMapFullscreen).toBe(false);
  });
});
