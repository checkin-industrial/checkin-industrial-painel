import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmpresaVizinhanca } from "./useEmpresaVizinhanca";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const RESPONSE = {
  empresaBase: {
    id: "emp-1",
    nomeFantasia: "Empresa",
    cnaePrincipal: "1234567",
    setor: "industria",
    numeroFuncionarios: 5,
    municipio: "Bauru",
    latitude: -22.4,
    longitude: -49.1,
  },
  empresasProximas: [],
};

describe("useEmpresaVizinhanca", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("quando selectedEmpresaId=null, useQuery disabled e nenhum fetch dispara", () => {
    const { result } = renderHook(() => useEmpresaVizinhanca(null), { wrapper: makeWrapper() });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.vizinhanca).toBe(null);
    expect(result.current.reportLoading).toBe(false);
    expect(result.current.reportError).toBe(null);
  });

  it("com selectedEmpresaId, dispara fetch e popula data quando ok", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { result } = renderHook(() => useEmpresaVizinhanca("emp-1"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.vizinhanca).not.toBe(null));
    expect(result.current.vizinhanca?.empresaBase.id).toBe("emp-1");
    expect(result.current.reportError).toBe(null);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/empresas\/emp-1\/neighbors\?radius=5000&limit=20$/);
  });

  it("propaga error.message como reportError quando fetch falha", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const { result } = renderHook(() => useEmpresaVizinhanca("emp-X"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.reportError).not.toBe(null));
    expect(typeof result.current.reportError).toBe("string");
  });
});
