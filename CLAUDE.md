# checkin-industrial-painel

Frontend React + Vite que consome a [checkin-industrial-api](https://github.com/checkin-industrial/checkin-industrial-api).
Funciona como widget lightweight embeddable em sites (sem SSR, sem roteamento por URL — navega via tabs no `App.tsx`).

## Stack

- **React 19** + **TypeScript 5.7** + **Vite 7**
- **react-leaflet 5** + **leaflet** + **leaflet.heat** (mapa industrial)
- **TanStack Query v5** (cache de dados + dedup + retry — provider registrado em `main.tsx`)
- **Vitest 4** + **@testing-library/react** (testes)
- **ESLint 9 flat config** + **Prettier 3**
- Sem React Router, sem state management lib (useState/Context bastam pro escopo).

## Estrutura

```
checkin-industrial-painel/
├── .github/
│   ├── workflows/ci.yml         # lint + typecheck + test + build + audit
│   ├── dependabot.yml           # npm + actions updates
│   └── CODEOWNERS
├── public/                      # assets estaticos servidos como-esta (favicon, manifest, sw.js)
├── src/
│   ├── App.tsx                  # shell + roteamento por tab (useState)
│   ├── main.tsx                 # entry; cria QueryClient e monta React tree
│   ├── styles.css               # CSS global (TODO: quebrar em CSS Modules por feature)
│   ├── features/
│   │   ├── empresas/            # mapa industrial + gestao + sub-componentes do mapa
│   │   ├── pontosInstitucionais/# cards publicos + tela de gestao
│   │   ├── telefonesUteis/      # cards + gestao
│   │   └── shared/              # componentes UI compartilhados entre features
│   ├── shared/
│   │   ├── api/apiClient.ts     # fetch wrapper com X-Api-Key + apiUrl/staticUrl
│   │   └── hooks/useDraggable.ts
│   ├── test/setup.ts            # bootstrap do Vitest (jest-dom matchers, fetch mock default)
│   └── imagens/logo.png
├── eslint.config.js             # flat config (ESLint 9+)
├── .prettierrc.json
├── tsconfig.json + tsconfig.app.json + tsconfig.node.json
├── vite.config.ts               # proxy /api e /uploads + config Vitest
├── index.html
└── package.json
```

## Configuracao (env vars de build)

| Env var | Default | O que faz |
|---|---|---|
| `VITE_API_BASE` | `""` (vazio) | URL base da API. **Em dev**: deixe vazio — o Vite proxy redireciona `/api` e `/uploads` pra `VITE_DEV_PROXY_TARGET`. **Em prod**: defina pra URL absoluta do backend (ex: `https://api.senailp.com.br/turismoindustrial_api`). Aplicado em build time. |
| `VITE_DEV_PROXY_TARGET` | URL de prod | So usado em `npm run dev`. Aponta pra http://localhost:8080 pra falar com docker-compose local. |

Em prod, sobrescrever via `.env.production` ou env vars do CI/host de deploy.

> A antiga `VITE_API_KEY` (chave admin embutida no bundle em build-time) foi removida. A chave agora eh coletada em runtime via `LoginModal` (ver "Auth admin" abaixo).

## Auth admin

A API protege endpoints de escrita (POST/PUT/DELETE/Upload/Import/Geocode) com o header `X-Api-Key`. A chave **nao** fica no bundle - cada admin autorizado recebe a chave fora-de-banda (e-mail, Slack, etc.) e a digita ao tentar abrir uma tela de gestao.

**Fluxo:**

1. Visitante navega normalmente (mapa, cards publicos) sem autenticacao.
2. Ao clicar em qualquer item do submenu **Gestão** (Empresas, Pontos, Telefones), `App.tsx` intercepta a navegacao e abre o `LoginModal` (em vez de mudar de tab).
3. Usuario digita a chave; o handler valida tocando `DELETE /api/empresas/{guid-impossivel}`:
   - **401**: chave invalida → mostra erro inline, mantem o input pra correcao.
   - **404** (ou qualquer outro nao-401): chave valida (endpoint passou auth, so nao achou o registro) → salva em `sessionStorage` e abre a tela de gestao desejada.
4. Em qualquer 401 durante uso (escrita real que falha), `apiFetch` chama `notifyUnauthorized()`, que limpa o storage e dispara `auth:unauthorized`. O `AuthProvider` escuta esse evento e zera o estado; o `App.tsx` redireciona pro mapa.
5. Botao **Sair** no submenu Gestao (visivel so quando autenticado) chama `logout()`.

**Persistencia:** `sessionStorage` (some ao fechar a aba). Escolha consciente de seguranca - cada nova aba/janela exige login novo.

**Arquivos principais:**

- `src/shared/auth/AuthContext.tsx` - Provider, `useAuth()` hook, helpers standalone (`getStoredApiKey`, `notifyUnauthorized`) usados pelo `apiFetch`.
- `src/shared/auth/LoginModal.tsx` - UI do login.
- `src/shared/api/apiClient.ts` - le a chave do storage e injeta `X-Api-Key` em writes; dispara `notifyUnauthorized()` em 401.

## Como adicionar uma feature

1. Crie `src/features/<feature>/`.
2. Pra cada tela/componente, crie um arquivo `.tsx` na pasta da feature.
3. Pra chamadas de API, importe `apiFetch` de `../../shared/api/apiClient` e use com TanStack Query:

```tsx
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";

function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: () => apiFetch<Empresa[]>("GET", "/api/empresas"),
  });
}
```

4. Adicione um `CLAUDE.md` na pasta descrevendo: telas, contratos com a API, gotchas.

## Como rodar localmente

Pre-requisitos: Node 20 + a API rodando (via docker-compose em `checkin-industrial-tests-e2e/docker-compose/`).

```bash
npm install

# Aponta o proxy pro docker-compose local
VITE_DEV_PROXY_TARGET=http://localhost:8080 npm run dev

# OU usar o target padrao (producao) - so leitura de dados reais
npm run dev
```

App em <http://localhost:5173>.

## Scripts

| Comando | Funcao |
|---|---|
| `npm run dev` | Vite dev server com HMR |
| `npm run build` | TypeScript typecheck + Vite build (output em `dist/`) |
| `npm run preview` | Serve o `dist/` produzido (smoke test do build) |
| `npm run lint` | ESLint (warnings nao bloqueiam) |
| `npm run lint:strict` | ESLint `--max-warnings 0` (CI rigoroso, futuro) |
| `npm run typecheck` | TypeScript sem emitir |
| `npm test` | Vitest run unico |
| `npm run test:watch` | Vitest em watch mode |

## TODOs / Debito tecnico

- **Decompor `EmpresasFilterMapExample.tsx` (1914 linhas)**: o componente do mapa principal acumulou mapa + filtros + popup + rota + sub-mapa de vizinhanca. Quebrar em sub-componentes (FilterPanel, EmpresaPopup, NeighborhoodOverlay, RouteOverlay) facilita manutencao por IA. Quando fizer, mover sub-componentes pra `features/empresas/components/`.
- **CSS Modules por feature**: o `styles.css` global tem 2890 linhas. Migrar regras pra `<Componente>.module.css` ao lado de cada componente. Comecar pelas features menores.
- **Migrar fetches manuais pra TanStack Query**: hoje cada componente faz `useEffect + fetch + useState`. Migrar pra `useQuery` reduz boilerplate e ganha cache/dedup. Migrar feature por feature.
- **ESLint warnings**: 8 warnings hoje (react-hooks/exhaustive-deps, react-refresh). Reduzir e ligar `--max-warnings 0` no CI.
- **Cobertura de teste expandir**: hoje so o `apiClient.ts` tem testes (10 testes). Adicionar smoke tests por feature (renderiza, click navega, etc).
