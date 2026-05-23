# Feature: empresas

Mapa industrial publico (anonimo) + telas de gestao admin.

## Componentes

| Arquivo | Funcao | Tipo |
|---|---|---|
| `EmpresasFilterMapExample.tsx` (1914 linhas — TODO decompor) | Tela principal: mapa Leaflet + filtros + popups + rota + vizinhanca | Publico (anonimo) |
| `EmpresasMap.tsx` | Mapa simples reutilizavel | Publico |
| `EmpresaMarker.tsx` | Helper de criacao do icone do marker | Helper |
| `EmpresasManagementScreen.tsx` (713 linhas) | CRUD admin de empresas | **Requer X-Api-Key** |

## Contratos com a API

Endpoints consumidos sob `/api/empresas`:

| Verbo | Path | Quem usa | Auth |
|---|---|---|---|
| GET | `/` | EmpresasFilterMapExample (lista pro mapa) | anonimo |
| GET | `/filter` | EmpresasFilterMapExample (filtro avancado) | anonimo |
| GET | `/{id}` | EmpresasManagementScreen (detalhe) | anonimo |
| GET | `/{id}/neighbors` | EmpresasFilterMapExample (vizinhanca) | anonimo |
| POST | `/` | EmpresasManagementScreen (criar) | **X-Api-Key** |
| PUT | `/{id}` | EmpresasManagementScreen (editar) | **X-Api-Key** |
| DELETE | `/{id}` | EmpresasManagementScreen (deletar) | **X-Api-Key** |
| POST | `/geocode` | EmpresasManagementScreen (geocodar endereco) | **X-Api-Key** |

Tambem consome OSRM (`router.project-osrm.org`) pra calculo de rota e OpenStreetMap tiles.

## Gotchas

- **Setor/Porte enums**: a API retorna como int via JSON, o painel mapeia pra labels PT-BR localmente. Cuidado ao adicionar enum novo na API — atualizar o mapeamento no painel.
- **Vizinhanca**: `GetEmpresaNeighbors` retorna empresas dentro de um raio. UI mostra como overlay no mapa principal + sub-mapa numa modal.
- **Geocoding**: usa OpenStreetMap Nominatim via API backend. Limitado por rate (1 req/s). Em volumes altos, considerar provider pago.
- **Markers**: criados via `createEmpresaMarkerIcon` em `EmpresaMarker.tsx`. Usa SVG inline + HTML escape.

## Hooks/utils compartilhados usados

- `apiFetch` de `../../shared/api/apiClient`
- `useDraggable` de `../../shared/hooks/useDraggable` (modais arrastaveis)
