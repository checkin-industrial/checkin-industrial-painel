import { useAuth } from "../../../shared/auth/AuthContext";
import type { useDraggable } from "../../../shared/hooks/useDraggable";
import { staticUrl } from "../../../shared/api/apiClient";
import {
  getPontoInstitucionalTipoBadgeClass,
  getPontoInstitucionalTipoIcon,
  getPontoInstitucionalTipoIconClass,
  getPontoInstitucionalTipoLabel,
  type PontoInstitucionalMapItem,
} from "../../pontosInstitucionais/markerHelpers";
import { useMapContext } from "../MapContext";
import type { EmpresaVizinha, ReportSectionKey } from "../types";

// Painel direito de "Relatório de Vizinhança" - mostra info da empresa selecionada
// (ou ponto institucional) + vizinhos no raio + agrupamentos por CNAE/setor +
// metricas. E o consumidor mais rico do MapContext.
//
// Memos derivados que dependem de logica especifica do container (mesmoCnae,
// mesmoSetor, distancia media) entram via props - calcular aqui obrigaria
// reexportar mais coisa do Context sem ganho real.
type NeighborhoodReportPanelProps = {
  draggable: ReturnType<typeof useDraggable>;
  possuiSelecao: boolean;
  pontoInstitucionalSelecionado: PontoInstitucionalMapItem | null;
  empresasMesmoCnae: EmpresaVizinha[];
  empresasMesmoSetor: EmpresaVizinha[];
  avgDistanceKm: number;
  onRouteFromAddress: () => void;
  onToggleReportSection: (section: ReportSectionKey) => void;
};

export function NeighborhoodReportPanel({
  draggable,
  possuiSelecao,
  pontoInstitucionalSelecionado,
  empresasMesmoCnae,
  empresasMesmoSetor,
  avgDistanceKm,
  onRouteFromAddress,
  onToggleReportSection,
}: NeighborhoodReportPanelProps) {
  const { isAuthenticated } = useAuth();
  const {
    panelsVisible,
    setPanelsVisible,
    reportCollapsed,
    selectedEmpresaId,
    selectedPontoInstitucionalId,
    vizinhanca,
    reportLoading,
    reportError,
    routeEnabled,
    routeLoading,
    routeError,
    routeInfo,
    collapsedReportSections,
    onAdminEditEmpresa,
  } = useMapContext();

  if (!panelsVisible.relatorio || !possuiSelecao) {
    return null;
  }

  const empresasProximas = vizinhanca?.empresasProximas ?? [];
  const exibirBlocosVizinhanca = !selectedPontoInstitucionalId;

  const baseClass = "map-left-sidebar map-left-sidebar--selection map-left-sidebar--animated report-panel map-side-panel map-side-panel--report draggable-panel";
  const asideClassName = [
    baseClass,
    reportCollapsed ? "collapsed" : null,
    draggable.isDragging ? "dragging" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      key={`report-${selectedEmpresaId ?? "none"}-${selectedPontoInstitucionalId ?? "none"}`}
      ref={draggable.ref}
      className={asideClassName}
    >
      <header
        className="report-header panel-toggle-header"
        onMouseDown={draggable.handleMouseDown}
        style={{ cursor: draggable.isDragging ? "grabbing" : "grab" }}
      >
        <div>
          <h3>Relatório de Vizinhança</h3>
          {!reportCollapsed && (
            <p>
              {selectedPontoInstitucionalId
                ? "Detalhes do ponto institucional"
                : "Empresas em um raio de 5 km"}
            </p>
          )}
        </div>
        <div className="panel-header-actions" onMouseDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="panel-icon-btn panel-icon-btn--inverse panel-icon-btn--danger"
            onClick={() => setPanelsVisible((prev) => ({ ...prev, relatorio: false }))}
            aria-label="Fechar relatório da vizinhança"
            title="Fechar"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
      </header>

      {!reportCollapsed && (
        <>
          {routeEnabled && (
            <section className="report-block">
              <h4>Rota da sua localização</h4>
              {routeLoading && <p className="report-empty-state">Calculando trajeto...</p>}
              {!routeLoading && routeError && <p className="status-error">{routeError}</p>}
              {!routeLoading && !routeError && routeInfo && (
                <div className="report-company-card">
                  <span><strong>Distância:</strong> {routeInfo.distanceKm.toFixed(2)} km</span>
                  <span><strong>Tempo estimado:</strong> {routeInfo.durationMin.toFixed(0)} min</span>
                </div>
              )}
            </section>
          )}

          <section className="report-block">
            <h4>Ponto institucional selecionado</h4>
            {!selectedPontoInstitucionalId && <p className="report-empty-state">Clique em um ponto institucional para ver detalhes de parceria e contato.</p>}
            {pontoInstitucionalSelecionado && (
              <div className="report-company-card report-company-card--institutional">
                {pontoInstitucionalSelecionado.cardFotoUrl && (
                  <img
                    className="report-institution-card-image"
                    src={staticUrl(pontoInstitucionalSelecionado.cardFotoUrl)}
                    alt={`Imagem de capa de ${pontoInstitucionalSelecionado.nome}`}
                    loading="lazy"
                  />
                )}
                {pontoInstitucionalSelecionado.logoUrl && (
                  <img
                    className="report-institution-logo"
                    src={staticUrl(pontoInstitucionalSelecionado.logoUrl)}
                    alt={`Logo de ${pontoInstitucionalSelecionado.nome}`}
                    loading="lazy"
                  />
                )}
                <strong>{pontoInstitucionalSelecionado.nome}</strong>
                <span>
                  <strong>Tipo:</strong>{" "}
                  <span className={getPontoInstitucionalTipoBadgeClass(pontoInstitucionalSelecionado.tipo)}>
                    <span className={getPontoInstitucionalTipoIconClass(pontoInstitucionalSelecionado.tipo)} aria-hidden="true">
                      {getPontoInstitucionalTipoIcon(pontoInstitucionalSelecionado.tipo)}
                    </span>
                    {getPontoInstitucionalTipoLabel(pontoInstitucionalSelecionado.tipo)}
                  </span>
                </span>
                <span>{pontoInstitucionalSelecionado.descricao}</span>
                <div className="report-address-row">
                  <span><strong>Endereço:</strong> {pontoInstitucionalSelecionado.endereco}</span>
                  <button
                    type="button"
                    className={routeEnabled ? "report-address-route-btn active" : "report-address-route-btn"}
                    onClick={onRouteFromAddress}
                    disabled={routeLoading}
                    aria-label={`Traçar rota até ${pontoInstitucionalSelecionado.nome}`}
                    title={routeLoading ? "Calculando rota..." : "Traçar rota até este endereço"}
                  >
                    <span className="report-route-icon" aria-hidden="true" />
                  </button>
                </div>
                <span><strong>Atividades:</strong> {pontoInstitucionalSelecionado.atividadesDisponiveis}</span>
                <span><strong>Equipe de gestão:</strong> {pontoInstitucionalSelecionado.equipeGestao}</span>
                <span><strong>Contato:</strong> {pontoInstitucionalSelecionado.contatoNome}</span>
                <span><strong>Telefone:</strong> {pontoInstitucionalSelecionado.contatoTelefone}</span>
                <span><strong>Email:</strong> {pontoInstitucionalSelecionado.contatoEmail}</span>
                {pontoInstitucionalSelecionado.responsavelFotoUrl && (
                  <a
                    className="report-link"
                    href={staticUrl(pontoInstitucionalSelecionado.responsavelFotoUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="report-contact-photo"
                      src={staticUrl(pontoInstitucionalSelecionado.responsavelFotoUrl)}
                      alt={`Foto de ${pontoInstitucionalSelecionado.contatoNome || "responsável"}`}
                      loading="lazy"
                    />
                    <span>Foto da pessoa responsável</span>
                  </a>
                )}
              </div>
            )}
          </section>

          {exibirBlocosVizinhanca && (
            <>
              <section className="report-block">
                <h4>Empresa base</h4>
                {!selectedEmpresaId && <p className="report-empty-state">Clique em um marcador para analisar a vizinhança em 5 km.</p>}
                {selectedEmpresaId && reportLoading && <p className="report-empty-state">Carregando vizinhança...</p>}
                {selectedEmpresaId && reportError && <p className="status-error">{reportError}</p>}
                {!reportLoading && !reportError && vizinhanca?.empresaBase && (
                  <div className="report-company-card">
                    <strong>{vizinhanca.empresaBase.nomeFantasia}</strong>
                    <span>CNAE: {vizinhanca.empresaBase.cnaePrincipal}</span>
                    <span>Setor: {vizinhanca.empresaBase.setor}</span>
                    <span>Município: {vizinhanca.empresaBase.municipio}</span>
                    <span>Funcionários: {vizinhanca.empresaBase.numeroFuncionarios}</span>
                    {isAuthenticated && onAdminEditEmpresa && vizinhanca.empresaBase.id && (
                      <button
                        type="button"
                        className="ghost btn-with-icon btn-action-edit btn-edit-empresa-from-map"
                        onClick={() => onAdminEditEmpresa(vizinhanca.empresaBase.id)}
                      >
                        Editar cadastro
                      </button>
                    )}
                  </div>
                )}
              </section>

              <section className="report-block">
                <div className="report-section-header">
                  <h4>Empresas proximas ({empresasProximas.length})</h4>
                  <button
                    type="button"
                    className="report-section-toggle"
                    onClick={() => onToggleReportSection("proximas")}
                    aria-expanded={!collapsedReportSections.proximas}
                    aria-label={collapsedReportSections.proximas ? "Expandir empresas proximas" : "Colapsar empresas proximas"}
                  >
                    {collapsedReportSections.proximas ? "+" : "-"}
                  </button>
                </div>
                {!collapsedReportSections.proximas && (
                  <ol className="report-list">
                    {!reportLoading && !reportError && empresasProximas.map((empresa) => (
                      <li key={empresa.id}>
                        <strong>{empresa.nomeFantasia}</strong>
                        <br />
                        {empresa.setor} | {empresa.cnaePrincipal} | {empresa.municipio}
                        <br />
                        Funcionários: {empresa.numeroFuncionarios} | Distância: {(empresa.distanciaMetros / 1000).toFixed(2)} km
                      </li>
                    ))}
                    {!reportLoading && !reportError && selectedEmpresaId && empresasProximas.length === 0 && <li>Nenhuma empresa encontrada dentro do raio de 5 km.</li>}
                  </ol>
                )}
              </section>

              <section className="report-block">
                <div className="report-section-header">
                  <h4>Mesmo CNAE ({empresasMesmoCnae.length})</h4>
                  <button
                    type="button"
                    className="report-section-toggle"
                    onClick={() => onToggleReportSection("cnae")}
                    aria-expanded={!collapsedReportSections.cnae}
                    aria-label={collapsedReportSections.cnae ? "Expandir empresas do mesmo CNAE" : "Colapsar empresas do mesmo CNAE"}
                  >
                    {collapsedReportSections.cnae ? "+" : "-"}
                  </button>
                </div>
                {!collapsedReportSections.cnae && (
                  <ol className="report-list">
                    {!reportLoading && !reportError && empresasMesmoCnae.map((empresa) => (
                      <li key={empresa.id}>{empresa.nomeFantasia}: {(empresa.distanciaMetros / 1000).toFixed(2)} km</li>
                    ))}
                    {!reportLoading && !reportError && selectedEmpresaId && empresasMesmoCnae.length === 0 && <li>Nenhuma empresa com o mesmo CNAE no raio atual.</li>}
                  </ol>
                )}
              </section>

              <section className="report-block">
                <div className="report-section-header">
                  <h4>Mesmo setor ({empresasMesmoSetor.length})</h4>
                  <button
                    type="button"
                    className="report-section-toggle"
                    onClick={() => onToggleReportSection("setor")}
                    aria-expanded={!collapsedReportSections.setor}
                    aria-label={collapsedReportSections.setor ? "Expandir empresas do mesmo setor" : "Colapsar empresas do mesmo setor"}
                  >
                    {collapsedReportSections.setor ? "+" : "-"}
                  </button>
                </div>
                {!collapsedReportSections.setor && (
                  <ol className="report-list">
                    {!reportLoading && !reportError && empresasMesmoSetor.map((empresa) => (
                      <li key={empresa.id}>{empresa.nomeFantasia}: {(empresa.distanciaMetros / 1000).toFixed(2)} km</li>
                    ))}
                    {!reportLoading && !reportError && selectedEmpresaId && empresasMesmoSetor.length === 0 && <li>Nenhuma empresa do mesmo setor no raio atual.</li>}
                  </ol>
                )}
              </section>

              <div className="report-metrics">
                <div>
                  <span>Distância média</span>
                  <strong>{avgDistanceKm.toFixed(1)} km</strong>
                </div>
                <div>
                  <span>Empresas na área</span>
                  <strong>{empresasProximas.length}</strong>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}
