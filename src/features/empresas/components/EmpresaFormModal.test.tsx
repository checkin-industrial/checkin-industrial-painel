import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmpresaFormModal } from "./EmpresaFormModal";
import { INITIAL_FORM } from "../types";
import type { EmpresaCreatePayload } from "../types";

function setup(overrides: Partial<Parameters<typeof EmpresaFormModal>[0]> = {}) {
  const setFormData = vi.fn();
  const onSubmit = vi.fn((e) => e.preventDefault());
  const onClose = vi.fn();
  const onGeocode = vi.fn();

  render(
    <EmpresaFormModal
      isOpen={true}
      editingId={null}
      formData={INITIAL_FORM}
      setFormData={setFormData}
      submitting={false}
      geocoding={false}
      onSubmit={onSubmit}
      onClose={onClose}
      onGeocode={onGeocode}
      {...overrides}
    />,
  );

  return { setFormData, onSubmit, onClose, onGeocode };
}

describe("EmpresaFormModal (smoke)", () => {
  it("nao renderiza quando isOpen=false", () => {
    setup({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("titulo 'Nova Empresa' quando editingId=null", () => {
    setup();
    expect(screen.getByRole("heading", { name: /Nova Empresa/i })).toBeInTheDocument();
  });

  it("titulo 'Editar Empresa' quando editingId tem valor", () => {
    setup({ editingId: "abc-123" });
    expect(screen.getByRole("heading", { name: /Editar Empresa/i })).toBeInTheDocument();
  });

  it("click no Fechar chama onClose", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("submit do form chama onSubmit", () => {
    const filledForm: EmpresaCreatePayload = {
      ...INITIAL_FORM,
      cnpj: "12345678000195",
      razaoSocial: "Empresa Teste",
      nomeFantasia: "Teste",
      cnaePrincipal: "6201500",
      endereco: "Rua A, 1",
      telefone: "11999999999",
      cep: "13010010",
      municipio: "Campinas",
      descricaoCnae: "Desenvolvimento",
    };
    const { onSubmit } = setup({ formData: filledForm });
    const form = screen.getByRole("button", { name: /Cadastrar Empresa/i }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("mudar CNPJ chama setFormData com updater funcional", () => {
    // Pattern do componente: setFormData((prev) => ({ ...prev, cnpj: event.target.value }))
    // Como o input e controlled (value={formData.cnpj} via INITIAL_FORM="") + setFormData
    // mock nao re-render, React reverte o DOM e event.target.value perde o valor
    // quando o updater for executado depois. Testamos apenas que setFormData foi
    // chamado com uma funcao - o trim/passthrough do valor ja e coberto pelo
    // smoke do container.
    const { setFormData } = setup();
    const cnpjInput = screen.getByLabelText(/CNPJ/i);
    fireEvent.change(cnpjInput, { target: { value: "12345678000195" } });
    expect(setFormData).toHaveBeenCalledOnce();
    expect(typeof setFormData.mock.calls[0][0]).toBe("function");
  });

  it("botao Geocode desabilitado quando endereco vazio", () => {
    setup({ formData: { ...INITIAL_FORM, endereco: "" } });
    expect(screen.getByRole("button", { name: /Atualizar Geolocaliza/i })).toBeDisabled();
  });

  it("botao Geocode habilitado e dispara onGeocode quando endereco preenchido", () => {
    const { onGeocode } = setup({ formData: { ...INITIAL_FORM, endereco: "Rua A, 1" } });
    const btn = screen.getByRole("button", { name: /Atualizar Geolocaliza/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onGeocode).toHaveBeenCalledOnce();
  });

  it("estado submitting troca rotulo do botao Salvar e desabilita botoes", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: /Salvando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
  });
});
