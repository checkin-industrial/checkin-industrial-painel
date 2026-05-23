import { useEffect, useRef, useState } from "react";
import { EmpresasFilterMapExample } from "./features/empresas/EmpresasFilterMapExample";
import { EmpresasManagementScreen } from "./features/empresas/EmpresasManagementScreen";
import { PontosInstitucionaisManagementScreen } from "./features/pontosInstitucionais/PontosInstitucionaisManagementScreen";
import { PontosInstitucionaisCardsScreen } from "./features/pontosInstitucionais/PontosInstitucionaisCardsScreen";
import { TelefonesUteisCardsScreen } from "./features/telefonesUteis/TelefonesUteisCardsScreen";
import { TelefonesUteisManagementScreen } from "./features/telefonesUteis/TelefonesUteisManagementScreen";
import logo from "./imagens/logo.png";

type DashboardTab = "mapa" | "gestao" | "gestao-pontos" | "cards-pontos" | "cards-telefones" | "gestao-telefones";

type MapTargetPoint = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  requestId: number;
};

export function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("mapa");
  const [mapTargetPoint, setMapTargetPoint] = useState<MapTargetPoint | null>(null);
  const [isGestaoMenuOpen, setIsGestaoMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const gestaoMenuRef = useRef<HTMLDivElement | null>(null);
  const navigationRef = useRef<HTMLElement | null>(null);

  const isGestaoTabAtiva = activeTab === "gestao"
    || activeTab === "gestao-pontos"
    || activeTab === "gestao-telefones";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!gestaoMenuRef.current?.contains(event.target as Node)) {
        setIsGestaoMenuOpen(false);
      }

      if (!navigationRef.current?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNavigate(tab: DashboardTab) {
    setActiveTab(tab);
    setIsGestaoMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  function handleRouteToPointFromCards(point: { id: string; nome: string; latitude: number; longitude: number }) {
    setMapTargetPoint({
      ...point,
      requestId: Date.now(),
    });
    setActiveTab("mapa");
    setIsGestaoMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img src={logo} alt="Ícone do Cheking Industrial" className="topbar-logo" />
          <strong>Check-in Industrial</strong>
        </div>
        <button
          type="button"
          className={isMobileMenuOpen ? "mobile-menu-toggle active" : "mobile-menu-toggle"}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? "Fechar menu principal" : "Abrir menu principal"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="main-navigation"
          ref={navigationRef}
          className={isMobileMenuOpen ? "topbar-nav open" : "topbar-nav"}
          aria-label="Seções principais"
        >
          <button
            type="button"
            className={activeTab === "mapa" ? "top-link active" : "top-link"}
            onClick={() => handleNavigate("mapa")}
          >
            Mapa Industrial
          </button>

          <button
            type="button"
            className={activeTab === "cards-pontos" ? "top-link active" : "top-link"}
            onClick={() => handleNavigate("cards-pontos")}
          >
            Pontos Institucionais
          </button>

          <button
            type="button"
            className={activeTab === "cards-telefones" ? "top-link active" : "top-link"}
            onClick={() => handleNavigate("cards-telefones")}
          >
            Telefones Úteis
          </button>

          <div className="topbar-menu-group" ref={gestaoMenuRef}>
            <button
              type="button"
              className={isGestaoTabAtiva || isGestaoMenuOpen ? "top-link top-link-menu active" : "top-link top-link-menu"}
              onClick={() => setIsGestaoMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isGestaoMenuOpen}
            >
              Gestão
              <span className="top-link-caret" aria-hidden="true">{isGestaoMenuOpen ? "▲" : "▼"}</span>
            </button>

            {isGestaoMenuOpen && (
              <div className="top-submenu" role="menu" aria-label="Submenu de gestão">
                <button
                  type="button"
                  className={activeTab === "gestao" ? "top-submenu-link active" : "top-submenu-link"}
                  role="menuitem"
                  onClick={() => handleNavigate("gestao")}
                >
                  Empresas
                </button>
                <button
                  type="button"
                  className={activeTab === "gestao-pontos" ? "top-submenu-link active" : "top-submenu-link"}
                  role="menuitem"
                  onClick={() => handleNavigate("gestao-pontos")}
                >
                  Pontos Institucionais
                </button>
                <button
                  type="button"
                  className={activeTab === "gestao-telefones" ? "top-submenu-link active" : "top-submenu-link"}
                  role="menuitem"
                  onClick={() => handleNavigate("gestao-telefones")}
                >
                  Gestão Telefones Úteis
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className={activeTab === "mapa" ? "page page-map" : "page"}>
        {activeTab === "mapa" && <EmpresasFilterMapExample mapTargetPoint={mapTargetPoint} />}
        {activeTab === "gestao" && <EmpresasManagementScreen />}
        {activeTab === "gestao-pontos" && <PontosInstitucionaisManagementScreen />}
        {activeTab === "cards-pontos" && <PontosInstitucionaisCardsScreen onRouteToPoint={handleRouteToPointFromCards} />}
        {activeTab === "cards-telefones" && <TelefonesUteisCardsScreen />}
        {activeTab === "gestao-telefones" && <TelefonesUteisManagementScreen />}
      </main>
    </div>
  );
}
