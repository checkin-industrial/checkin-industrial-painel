/**
 * Dispara o download de um Blob no browser usando um <a download> ad-hoc.
 * Reusavel pelas telas admin que exportam CSV (Empresas + Pontos Institucionais).
 *
 * Cria URL via `createObjectURL`, anexa um `<a hidden>` ao DOM, dispara
 * o click() e revoga a URL — sem efeito colateral persistente.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
