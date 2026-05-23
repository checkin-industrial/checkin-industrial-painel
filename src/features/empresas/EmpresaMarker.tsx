/* eslint-disable react-refresh/only-export-components -- helper (createEmpresaMarkerIcon)
 * + componente coabitam o mesmo arquivo intencionalmente (escopo de feature pequena). */
import { divIcon } from "leaflet";
import { Marker, Tooltip } from "react-leaflet";

export type EmpresaMapItem = {
  id: string;
  nomeFantasia: string;
  latitude: number;
  longitude: number;
  setor: string;
  cnae: string;
  descricaoCnae: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilial: string;
  numeroFuncionarios: number;
};

type EmpresaMarkerProps = {
  empresa: EmpresaMapItem;
};

function getMarkerColor(setor: string) {
  switch (setor.toLowerCase()) {
    case "industria":
      return "#c2410c";
    case "comercio":
      return "#2563eb";
    default:
      return "#0f766e";
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createEmpresaMarkerIcon(
  setor: string,
  isSelected = false,
  nomeFantasia = "",
  showLabel = true,
) {
  const markerColor = isSelected ? getMarkerColor(setor) : "#6b7280";
  const markerClassName = isSelected ? "empresa-marker selected" : "empresa-marker";
  const wrapperClassName = isSelected ? "empresa-marker-label-wrap selected" : "empresa-marker-label-wrap";
  const safeNomeFantasia = escapeHtml(nomeFantasia);
  const labelHtml = showLabel && safeNomeFantasia
    ? `<span class="empresa-marker__label" title="${safeNomeFantasia}">${safeNomeFantasia}</span>`
    : "";
  const iconSize: [number, number] = labelHtml ? [170, 44] : [22, 30];

  return divIcon({
    className: "empresa-marker-wrapper",
    html: `<div class="${wrapperClassName}">${labelHtml}<div class="${markerClassName}" style="--marker-color:${markerColor}"><span class="empresa-marker__dot"></span></div></div>`,
    iconSize,
    iconAnchor: [11, 30],
    popupAnchor: [0, -30],
  });
}

export function EmpresaMarker({ empresa }: EmpresaMarkerProps) {
  const icon = createEmpresaMarkerIcon(empresa.setor, false, empresa.nomeFantasia);

  return (
    <Marker position={[empresa.latitude, empresa.longitude]} icon={icon}>
      <Tooltip direction="top" offset={[0, -10]}>
        <div>
          <strong>{empresa.nomeFantasia}</strong>
          <br />
          <strong>CNAE:</strong> {empresa.cnae}
          <br />
          <strong>Descrição CNAE:</strong> {empresa.descricaoCnae}
          <br />
          <strong>Setor:</strong> {empresa.setor}
          <br />
          <strong>Município:</strong> {empresa.municipio}
          <br />
          <strong>Telefone:</strong> {empresa.telefone}
          <br />
          <strong>CEP:</strong> {empresa.cep}
          <br />
          <strong>Unidade:</strong> {empresa.matrizOuFilial}
          <br />
          <strong>Funcionários:</strong> {empresa.numeroFuncionarios}
        </div>
      </Tooltip>
    </Marker>
  );
}