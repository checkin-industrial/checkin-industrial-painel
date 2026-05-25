import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "./shared/auth/AuthContext";
import { LoginModal } from "./shared/auth/LoginModal";
import logo from "./imagens/logo.png";

// Code-splitting: cada tela "pesada" vira um chunk separado, carregado sob
// demanda quando o usuario navega para a tab correspondente. Quebra o bundle
// principal (era 536kB) em chunks por feature, reduzindo o tempo ate o primeiro
// render no mapa publico (default tab).
//
// Componentes leves (LoginModal, etc.) permanecem eager: ja sao usados na
// inicializacao ou tem footprint pequeno demais para justificar um chunk.
const EmpresasFilterMapExample = lazy(() =>
  import("./features/empresas/EmpresasFilterMapExample").then((mod) => ({
    default: mod.EmpresasFilterMapExample,
  })),
);
const EmpresasManagementScreen = lazy(() =>
  import("./features/empresas/EmpresasManagementScreen").then((mod) => ({
    default: mod.EmpresasManagementScreen,
  })),
);
const GoogleMapsImportScreen = lazy(() =>
  import("./features/empresas/GoogleMapsImportScreen").then((mod) => ({
    default: mod.GoogleMapsImportScreen,
  })),
);
const PontosInstitucionaisManagementScreen = lazy(() =>
  import("./features/pontosInstitucionais/PontosInstitucionaisManagementScreen").then((mod) => ({
    default: mod.PontosInstitucionaisManagementScreen,
  })),
);
const PontosInstitucionaisCardsScreen = lazy(() =>
  import("./features/pontosInstitucionais/PontosInstitucionaisCardsScreen").then((mod) => ({
    default: mod.PontosInstitucionaisCardsScreen,
  })),
);
const TelefonesUteisCardsScreen = lazy(() =>
  import("./features/telefonesUteis/TelefonesUteisCardsScreen").then((mod) => ({
    default: mod.TelefonesUteisCardsScreen,
  })),
);
const TelefonesUteisManagementScreen = lazy(() =>
  import("./features/telefonesUteis/TelefonesUteisManagementScreen").then((mod) => ({
    default: mod.TelefonesUteisManagementScreen,
  })),
);

function TabFallback() {
  return <div className="page-loading">Carregando…</div>;
}

type DashboardTab = "mapa" | "gestao" | "gestao-pontos" | "cards-pontos" | "cards-telefones" | "gestao-telefones" | "import-google-maps";

const ADMIN_TABS: DashboardTab[] = ["gestao", "gestao-pontos", "gestao-telefones", "import-google-maps"];

function isAdminTab(tab: DashboardTab): boolean {
  return ADMIN_TABS.includes(tab);
}

type MapTargetPoint = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  requestId: number;
};

export function App() {
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("mapa");
  const [mapTargetPoint, setMapTargetPoint] = useState<MapTargetPoint | null>(null);
  const [isGestaoMenuOpen, setIsGestaoMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Quando o usuario clica numa tab admin sem estar autenticado, guardamos
  // o destino aqui e abrimos o modal de login. Sucesso -> navega; cancela -> descarta.
  const [pendingAdminTab, setPendingAdminTab] = useState<DashboardTab | null>(null);
  // Deep-link admin: id da empresa a ser editada ao chegar na tab "gestao".
  // Setada quando admin clica em "Editar cadastro" no popup do mapa publico;
  // EmpresasManagementScreen consome via prop e chama onEditConsumed pra limpar.
  const [pendingEditEmpresaId, setPendingEditEmpresaId] = useState<string | null>(null);
  const gestaoMenuRef = useRef<HTMLDivElement | null>(null);
  const navigationRef = useRef<HTMLElement | null>(null);

  const isGestaoTabAtiva = isAdminTab(activeTab);

  // Se a sessao expirar (401 em qualquer endpoint) enquanto o usuario esta numa
  // tab admin, redireciona pro mapa para evitar tela quebrada.
  useEffect(() => {
    if (!isAuthenticated && isAdminTab(activeTab)) {
      setActiveTab("mapa");
    }
  }, [isAuthenticated, activeTab]);

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
    // Intercepta navegacao admin: se nao autenticado, abre modal e segura o destino.
    if (isAdminTab(tab) && !isAuthenticated) {
      setPendingAdminTab(tab);
      setIsGestaoMenuOpen(false);
      setIsMobileMenuOpen(false);
      return;
    }
    setActiveTab(tab);
    setIsGestaoMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  function handleLoginSuccess() {
    if (pendingAdminTab) {
      setActiveTab(pendingAdminTab);
    }
    setPendingAdminTab(null);
  }

  function handleLogout() {
    logout();
    setActiveTab("mapa");
    setIsGestaoMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  function handleAdminEditEmpresaFromMap(empresaId: string) {
    if (!isAuthenticated) {
      // Defesa em profundidade: o botao so renderiza pra autenticados, mas se
      // a sessao expirar entre o render e o click, cai aqui. Abre o LoginModal
      // e segura o destino tanto pra tab quanto pra empresa.
      setPendingAdminTab("gestao");
      setPendingEditEmpresaId(empresaId);
      return;
    }
    setPendingEditEmpresaId(empresaId);
    setActiveTab("gestao");
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
                <button
                  type="button"
                  className={activeTab === "import-google-maps" ? "top-submenu-link active" : "top-submenu-link"}
                  role="menuitem"
                  onClick={() => handleNavigate("import-google-maps")}
                >
                  Importar do Google Maps
                </button>
                {isAuthenticated && (
                  <button
                    type="button"
                    className="top-submenu-link"
                    role="menuitem"
                    onClick={handleLogout}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 4, color: "#fca5a5" }}
                  >
                    Sair
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className={activeTab === "mapa" ? "page page-map" : "page"}>
        <Suspense fallback={<TabFallback />}>
          {activeTab === "mapa" && (
            <EmpresasFilterMapExample
              mapTargetPoint={mapTargetPoint}
              onAdminEditEmpresa={handleAdminEditEmpresaFromMap}
            />
          )}
          {activeTab === "gestao" && (
            <EmpresasManagementScreen
              pendingEditId={pendingEditEmpresaId}
              onEditConsumed={() => setPendingEditEmpresaId(null)}
            />
          )}
          {activeTab === "gestao-pontos" && <PontosInstitucionaisManagementScreen />}
          {activeTab === "cards-pontos" && <PontosInstitucionaisCardsScreen onRouteToPoint={handleRouteToPointFromCards} />}
          {activeTab === "cards-telefones" && <TelefonesUteisCardsScreen />}
          {activeTab === "gestao-telefones" && <TelefonesUteisManagementScreen />}
          {activeTab === "import-google-maps" && <GoogleMapsImportScreen onGoToManagement={() => setActiveTab("gestao")} />}
        </Suspense>
      </main>

      <LoginModal
        isOpen={pendingAdminTab !== null}
        onClose={() => setPendingAdminTab(null)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
