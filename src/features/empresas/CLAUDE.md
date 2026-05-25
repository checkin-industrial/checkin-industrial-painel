# Feature: empresas

Mapa industrial publico (anonimo) + telas de gestao admin + integracao Google Maps Import.

## Telas (componentes "shell")

| Arquivo | LOC | Funcao | Auth |
|---|---|---|---|
| `EmpresasFilterMapExample.tsx` | ~360 | Tela principal: mapa Leaflet + paineis flutuantes (filtros, relatorio vizinhanca) + legenda. Orquestra hooks + componentes; sem logica grossa propria. | Anonimo |
| `EmpresasManagementScreen.tsx` | ~390 | CRUD admin de empresas (toolbar + tabela + modal de form). | **X-Api-Key** |
| `GoogleMapsImportScreen.tsx` | — | Tela admin de import de empresas via Google Places. | **X-Api-Key** |
| `EmpresasMap.tsx` | ~70 | Mapa publico simples reutilizavel (sem filtros/UI), embed em outras telas se necessario. | Anonimo |
| `EmpresaMarker.tsx` | — | Helper de criacao do icone Leaflet do marker de empresa (`createEmpresaMarkerIcon`). | Helper |

`EmpresasFilterMapExample.tsx` foi decomposto de 1914→~360 linhas (-81%) em uma serie de PRs. A logica vive nos hooks e a UI nos componentes em `components/`.

## Estrutura

```text
src/features/empresas/
├── CLAUDE.md                       (este arquivo)
├── EmpresasFilterMapExample.tsx    (shell: monta Provider + compõe componentes)
├── EmpresasManagementScreen.tsx    (shell admin)
├── GoogleMapsImportScreen.tsx
├── EmpresasMap.tsx                 (mapa standalone)
├── EmpresaMarker.tsx               (helper de icon Leaflet)
├── MapContext.tsx                  (Context "puro" - so React.createContext + tipo)
├── useMapContext.ts                (hook consumidor do Context, isolado pra Fast Refresh)
├── MapHelpers.tsx                  (DEFAULT_CENTER/ZOOM, MAP_BOUNDS, MapFocusTarget,
│                                    MapViewport, HeatmapLayer, isCoordinateInsideViewportWindow)
├── empresaStatus.ts                (STATUS const + StatusEmpresa type + statusLabel/BadgeClass)
├── types.ts                        (DTOs: EmpresaFilterMapItem, EmpresaListItem,
│                                    EmpresaCreatePayload, EmpresaVizinhancaResponse,
│                                    FilterFormState, LayerToggleState, etc.)
├── hooks/                          (13 hooks - ver tabela abaixo)
└── components/                     (sub-componentes UI - ver tabela abaixo)
```

## Hooks (`hooks/`)

| Hook | Responsabilidade |
|---|---|
| `useFiltrosEmpresas` | Filtros de empresa + ponto institucional, flags "busca ativa", derivados `effectiveFilters`/`pontosTipoEfetivo`. |
| `useUserLocation` | `navigator.geolocation` wrapper: ativa, captura coords, alerta em erro. |
| `useRouteOSRM` | Calculo de rota OSRM via `useQuery`. `routeError` derivado (pre-condicoes > query error). |
| `useEmpresasMapData` | 3 `useQuery`: empresas (filter), heatmap (opt-in), pontos institucionais. |
| `useEmpresaVizinhanca` | `useQuery` de vizinhanca da empresa selecionada (radius=5000, limit=20). |
| `useMapFullscreen` | `requestFullscreen` + `exitFullscreen` + sync com evento `fullscreenchange`. Expoe ref pra elemento alvo. |
| `useMapDeepLink` | Reage ao prop `mapTargetPoint` externo (deep-link de outras telas pro mapa). Dedup via `requestId`. |
| `useCnaeMunicipioOptions` | Popula selects de CNAE/Municipio a partir das empresas (so atualiza sem filtros ativos pra preservar visao completa). |
| `useEmpresaMapSelectionEffects` | 3 useEffects de coerencia (limpa selecao quando some, reseta secoes do relatorio, limpa ponto quando filtro o exclui). |
| `useMapDerivedSelection` | 9 useMemos derivados (center, empresaSelecionada, rotaDestino, analysisCenter, empresasMesmoCnae/Setor, avgDistanceKm, etc.). |
| `useMapContextValue` | Memoiza o `MapContextValue` (objeto monolitico de ~40 campos) - extracao mecanica pra reduzir ruido. |
| `usePanelVisibility` | Estado dos paineis flutuantes (collapsed/visible) + `toggleFiltersPanel` + `resetFiltersBoxes`. |

Todos com testes Vitest (`*.test.ts` ao lado).

## Componentes (`components/`)

| Componente | Funcao |
|---|---|
| **Mapa publico** | |
| `MapStage.tsx` | Wrapper do `<MapContainer>` + camadas + loading overlay. |
| `EmpresasMarkersLayer.tsx` | Markers de empresas no mapa. Auto-clustering >200 visiveis. |
| `PontosInstitucionaisMarkersLayer.tsx` | Markers de pontos institucionais + filtro local (viewport + termo + tipo). |
| `UserLocationLayer.tsx` | Circle + Marker da localizacao do usuario (quando ativada). |
| `RouteOverlay.tsx` | Polyline da rota OSRM. |
| `FilterPanel.tsx` | Painel flutuante de filtros. CSS Module proprio. |
| `NeighborhoodReportPanel.tsx` | Painel flutuante de relatorio de vizinhanca + botao "tracar rota". CSS Module proprio. |
| `MapLegend.tsx` | Legenda + botoes de toggle (camadas, localizacao, fullscreen, filtros). CSS Module proprio. |
| **Admin (Gestao Empresas)** | |
| `EmpresasListToolbar.tsx` | Busca + filtro de status + botoes Nova/Atualizar. |
| `EmpresasTable.tsx` | Tabela com acoes condicionais por status (Editar/Excluir/Reativar/Aprovar/Rejeitar). |
| `EmpresaFormModal.tsx` | Modal Nova/Editar Empresa (form + geocode + cancel). |

Todos os componentes acima tem testes Vitest (`*.test.tsx`).

## Endpoints da API consumidos

Sob `/api/empresas`:

| Verbo | Path | Consumidor (hook/component) | Auth |
|---|---|---|---|
| GET | `/filter` | `useEmpresasMapData`, `EmpresasManagementScreen` | anonimo |
| GET | `/{id}` | `EmpresasManagementScreen` (detalhe pro modal) | anonimo |
| GET | `/{id}/neighbors` | `useEmpresaVizinhanca` | anonimo |
| POST | `/` | `EmpresasManagementScreen` (criar) | **X-Api-Key** |
| PUT | `/{id}` | `EmpresasManagementScreen` (editar/reativar/aprovar) | **X-Api-Key** |
| DELETE | `/{id}` | `EmpresasManagementScreen` (soft-delete -> Status=Inativo) | **X-Api-Key** |
| POST | `/geocode` | `EmpresasManagementScreen` (geocodar endereco) | **X-Api-Key** |
| POST | `/import/google-maps` | `GoogleMapsImportScreen` | **X-Api-Key** |
| GET | `/api/analytics/heatmap` | `useEmpresasMapData` (heatmap opt-in) | anonimo |
| GET | `/api/pontos-institucionais` | `useEmpresasMapData` (pontos no mapa publico) | anonimo |

Tambem consome OSRM (`router.project-osrm.org`) pra calculo de rota e OpenStreetMap tiles.

## Onde colocar coisas novas

| O que voce esta adicionando | Onde |
|---|---|
| Nova camada visual no mapa publico | `components/<Nome>Layer.tsx` + include em `MapStage.tsx` |
| Nova logica de state agregada (varios campos relacionados) | `hooks/use<Nome>.ts` |
| Novo `useEffect` de coerencia entre state e dados | `hooks/useEmpresaMapSelectionEffects.ts` (ou novo hook focado) |
| Novo `useQuery` da feature | hook proprio em `hooks/use<Nome>.ts` (vide `useEmpresaVizinhanca` como template) |
| Novo modal admin | `components/<Nome>Modal.tsx` consumido pelo container |
| Novo sub-painel no `MapContext` | adicionar ao tipo `MapContextValue` em `MapContext.tsx` + ao hook `useMapContextValue` + consumir via `useMapContext()` |
| Helpers visuais (icone marker, etc.) | `EmpresaMarker.tsx` ou um novo `<Nome>Helpers.tsx` |
| Tipo compartilhado entre container e sub-componentes | `types.ts` |

## Gotchas

- **Enums como string camelCase**: a API serializa `Setor`/`Porte`/`MatrizOuFilial`/`SituacaoCadastral`/`StatusEmpresa` como string camelCase (ex: `"industria"`, `"aguardandoRevisao"`). O painel envia strings nos payloads de Create/Update. A API aceita ambos (string e int) via `allowIntegerValues=true` por compat, mas use sempre strings em codigo novo. Ver `empresaStatus.ts` para a const `STATUS`.
- **`leaflet.heat` e `leaflet.markercluster` precisam de `L` global**: o container faz `import "leaflet"` ANTES dos plugin imports — ordem importa, senao `L is not defined` no runtime (plugins acoplam em `window.L`). Documentado inline em `EmpresasFilterMapExample.tsx`.
- **MapContext monolitico**: mudanca em qualquer campo re-renderiza todos os consumers. Aceitavel pra escopo atual (~6 sub-componentes). Se virar gargalo, dividir em Contexts menores (FiltersContext / SelectionContext / RouteContext).
- **`pontoInstitucionalSelecionado` aplica filtros antes do find**: se filtro exclui o ponto selecionado, o hook `useEmpresaMapSelectionEffects` deselleciona automaticamente (efeito de coerencia).
- **Soft-delete vs Status enum**: Empresas tem 3 status (`ativo`/`inativo`/`aguardandoRevisao`). DELETE no admin marca `inativo`. Imports Google Maps criam `aguardandoRevisao`. `EmpresaFilterService` propaga `Status` no DTO — bug historico (api#20) corrigido.
- **Markers**: `createEmpresaMarkerIcon` em `EmpresaMarker.tsx` usa SVG inline + HTML escape. `createPontoInstitucionalMarkerIcon` em `../pontosInstitucionais/markerHelpers.ts`.
- **Viewport bounds**: `MAP_BOUNDS` em `MapHelpers.tsx` define a janela do mapa publico (Bauru region). `isCoordinateInsideViewportWindow` filtra markers/heatmap-points pra evitar renderizar fora.

## Testes

Cobertura local com Vitest. Todos os hooks e components tem `.test.ts(x)` ao lado. Padroes:

- **Hooks puros**: `renderHook` + `act` direto.
- **Hooks com `useQuery`**: wrapper local com `QueryClient`/`QueryClientProvider` + `vi.spyOn(globalThis, "fetch")` por URL.
- **Components que renderizam react-leaflet**: `vi.mock("react-leaflet")` com shims de testid pra evitar DOM real do Leaflet (que exige `MapContainer` ancestor).
- **`useUserLocation`**: `navigator.geolocation` mockado via `Object.defineProperty`.

## Hooks/utils compartilhados usados

- `apiFetch` de `../../shared/api/apiClient`
- `useDraggable` de `../../shared/hooks/useDraggable` (paineis arrastaveis)
- `matchesPontoInstitucionalFilters` + helpers de tipo em `../pontosInstitucionais/markerHelpers`
