import "@testing-library/jest-dom/vitest";

// Mock global do `fetch` - testes que nao usam network nao quebram.
// Testes que precisam de fetch real devem mockar especificamente via vi.spyOn(globalThis, "fetch").
globalThis.fetch = globalThis.fetch ?? (() => Promise.reject(new Error("fetch nao mockado neste teste")));
