import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, getStoredApiKey, notifyUnauthorized, useAuth } from "./AuthContext";

const STORAGE_KEY = "ci-admin-api-key";
const TEST_KEY = "test-key-123";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    sessionStorage.clear();
  });

  it("inicia com nao-autenticado quando storage vazio", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiKey).toBeNull();
  });

  it("le chave do sessionStorage no boot", () => {
    sessionStorage.setItem(STORAGE_KEY, TEST_KEY);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiKey).toBe(TEST_KEY);
  });

  it("login com chave valida (404 do endpoint = chave OK) salva no storage", async () => {
    // 404 e o que a API retorna pra GUID impossivel - significa 'auth passou, registro nao existe'
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login(TEST_KEY);
    });

    expect(loginResult?.ok).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(TEST_KEY);
  });

  it("login com chave invalida (401) retorna ok=false e nao salva", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login("chave-errada");
    });

    expect(loginResult?.ok).toBe(false);
    expect(loginResult?.error).toMatch(/invalida|permissao/i);
    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("login com chave vazia/whitespace falha sem tocar a API", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login("   ");
    });

    expect(loginResult?.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("login com erro de rede retorna ok=false com mensagem", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network failure"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login(TEST_KEY);
    });

    expect(loginResult?.ok).toBe(false);
    expect(loginResult?.error).toContain("Network failure");
  });

  it("logout limpa storage e estado", async () => {
    sessionStorage.setItem(STORAGE_KEY, TEST_KEY);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("notifyUnauthorized() (chamado pelo apiFetch em 401) limpa estado", async () => {
    sessionStorage.setItem(STORAGE_KEY, TEST_KEY);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      notifyUnauthorized();
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("getStoredApiKey() (standalone, sem React) le do storage", () => {
    expect(getStoredApiKey()).toBeNull();
    sessionStorage.setItem(STORAGE_KEY, TEST_KEY);
    expect(getStoredApiKey()).toBe(TEST_KEY);
  });
});
