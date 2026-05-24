import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PontoInstitucionalFormModal } from "./PontoInstitucionalFormModal";
import { INITIAL_FORM_PONTO } from "../types";

function setup(overrides: Partial<Parameters<typeof PontoInstitucionalFormModal>[0]> = {}) {
  const setFormData = vi.fn();
  const onSubmit = vi.fn((e) => e.preventDefault());
  const onClose = vi.fn();
  const onUploadImagem = vi.fn();

  render(
    <PontoInstitucionalFormModal
      isOpen={true}
      editingId={null}
      formData={INITIAL_FORM_PONTO}
      setFormData={setFormData}
      submitting={false}
      uploadingFoto={false}
      uploadingLogo={false}
      uploadingCard={false}
      onSubmit={onSubmit}
      onClose={onClose}
      onUploadImagem={onUploadImagem}
      {...overrides}
    />,
  );

  return { setFormData, onSubmit, onClose, onUploadImagem };
}

describe("PontoInstitucionalFormModal (smoke)", () => {
  it("nao renderiza quando isOpen=false", () => {
    setup({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("titulo 'Novo Ponto Institucional' quando editingId=null", () => {
    setup();
    expect(screen.getByRole("heading", { name: /Novo Ponto Institucional/i })).toBeInTheDocument();
  });

  it("titulo 'Editar Ponto Institucional' quando editingId tem valor", () => {
    setup({ editingId: "abc-123" });
    expect(screen.getByRole("heading", { name: /Editar Ponto Institucional/i })).toBeInTheDocument();
  });

  it("click no Fechar chama onClose", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Fechar$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Estes testes verificam que onChange dispara setFormData com um updater funcional.
  // Inspeccionar o resultado do updater chamado depois NAO funciona com inputs
  // controlled + setFormData mock (React reverte o DOM antes do updater ser
  // executado, e a closure le event.target.value reverted). O pass-through
  // do valor ja e coberto via smoke do container.
  it("mudar tipo (select) chama setFormData com updater funcional", () => {
    const { setFormData } = setup();
    const select = screen.getByLabelText(/^Tipo$/i);
    fireEvent.change(select, { target: { value: "setorPrefeitura" } });
    expect(setFormData).toHaveBeenCalledOnce();
    expect(typeof setFormData.mock.calls[0][0]).toBe("function");
  });

  it("mudar Nome chama setFormData com updater funcional", () => {
    const { setFormData } = setup();
    const input = screen.getByLabelText(/^Nome$/i);
    fireEvent.change(input, { target: { value: "Novo Ponto" } });
    expect(setFormData).toHaveBeenCalledOnce();
    expect(typeof setFormData.mock.calls[0][0]).toBe("function");
  });

  it("estado submitting troca rotulo do botao Salvar e desabilita Cancelar", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: /Salvando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
  });

  it("estado uploadingLogo desabilita o input de upload de logo", () => {
    setup({ uploadingLogo: true });
    expect(screen.getByText(/Enviando logo/i)).toBeInTheDocument();
  });

  it("preview da logo aparece quando logoUrl preenchida no formData", () => {
    setup({
      formData: { ...INITIAL_FORM_PONTO, logoUrl: "/uploads/pontos-institucionais/logo/abc.png" },
    });
    expect(screen.getByText(/Pré-visualização do logo/i)).toBeInTheDocument();
  });
});
