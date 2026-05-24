# checkin-industrial-painel

Frontend **React 19** + **Vite 7** da plataforma [Check-in Industrial](https://github.com/checkin-industrial/checkin-industrial-docs/wiki). Widget público (mapa + cards) + área administrativa protegida por API Key.

---

📖 **Documentação completa** no [Wiki](https://github.com/checkin-industrial/checkin-industrial-docs/wiki)
📄 **Apresentação comercial**: [PDF](https://github.com/checkin-industrial/checkin-industrial-docs/blob/main/Apresentacao_Comercial_Plataforma_Industrial.pdf)

## O que é

Aplicação web embedável que consome a [API](https://github.com/checkin-industrial/checkin-industrial-api). Funciona como widget lightweight em sites de prefeituras/associações — sem SSR, sem roteamento por URL, navega via tabs.

## Stack

- **React 19** + **TypeScript 5.7** + **Vite 7**
- **react-leaflet 5** + **leaflet** + **leaflet.heat** (mapa industrial)
- **TanStack Query v5** (cache de dados + dedup + retry)
- **Vitest 4** + **@testing-library/react** (testes)
- **ESLint 9 flat config** + **Prettier 3**

Sem React Router, sem state management lib — useState e Context bastam pro escopo.

## Estrutura

```text
src/
├── App.tsx                          (shell + roteamento por tab)
├── main.tsx                         (entry; cria QueryClient + monta App)
├── styles.css                       (CSS global — TODO: CSS Modules por feature)
├── features/
│   ├── empresas/                    (mapa industrial + gestão admin)
│   ├── pontosInstitucionais/        (cards públicos + gestão)
│   └── telefonesUteis/              (cards + gestão)
└── shared/
    ├── api/apiClient.ts             (fetch wrapper com X-Api-Key)
    ├── auth/                        (AuthContext + LoginModal)
    └── hooks/useDraggable.ts
```

Detalhes em [`CLAUDE.md`](CLAUDE.md).

## Como rodar

```bash
npm install

# Stack inteira (precisa da API em ../checkin-industrial-tests-e2e/docker-compose/)
docker compose -f ../checkin-industrial-tests-e2e/docker-compose/docker-compose.yml up -d --build

# Painel em modo dev (HMR)
VITE_DEV_PROXY_TARGET=http://localhost:8080 npm run dev
```

App em <http://localhost:5173>.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Vite dev server com HMR |
| `npm run build` | Typecheck + Vite build (output em `dist/`) |
| `npm run preview` | Serve o `dist/` produzido |
| `npm run lint` | ESLint com `--max-warnings 0` |
| `npm run typecheck` | TypeScript sem emitir |
| `npm test` | Vitest |
| `npm run test:watch` | Vitest em watch mode |

## Variáveis de build

| Env var | Default | Função |
|---|---|---|
| `VITE_API_BASE` | `""` | URL base da API em prod. Em dev, vazio — Vite proxy redireciona `/api` |
| `VITE_DEV_PROXY_TARGET` | URL de prod | Só usado em `npm run dev`. Aponta pro docker-compose local |

## Auth admin

Endpoints de escrita da API exigem header `X-Api-Key`. O painel coleta a chave em **runtime** via [`LoginModal`](src/shared/auth/LoginModal.tsx) — não há chave embarcada no bundle.

Fluxo:
1. Visitante navega normalmente (mapa, cards) sem auth
2. Ao clicar em qualquer item do submenu **Gestão**, abre o modal
3. Chave correta → salva em `sessionStorage` (some ao fechar a aba) + abre a tela
4. Em 401 durante uso, `apiFetch` limpa o storage e redireciona pro mapa

Mais detalhes em [`CLAUDE.md` (Auth admin)](CLAUDE.md#auth-admin).

## Data fetching

Todas as features de CRUD usam **TanStack Query**. Convenção de queryKey:

```ts
queryKey: [FEATURE_KEY, ...variantes]
// invalidação após mutation:
queryClient.invalidateQueries({ queryKey: [FEATURE_KEY] })
```

Padrão canônico em [`TelefonesUteisManagementScreen.tsx`](src/features/telefonesUteis/TelefonesUteisManagementScreen.tsx) — usar como template pra features novas.

## CI

Workflow `.github/workflows/ci.yml`: `lint` (--max-warnings 0) + `typecheck` + `test` + `build` + `audit` em cada push e PR.

Antes de PR: rodar localmente `npm run typecheck && npm run lint && npm test && npm run build`.

## Repositórios irmãos

| Repo | Papel |
|---|---|
| [`checkin-industrial-api`](https://github.com/checkin-industrial/checkin-industrial-api) | Backend .NET 10 |
| [`checkin-industrial-tests-e2e`](https://github.com/checkin-industrial/checkin-industrial-tests-e2e) | Suíte E2E Robot Framework |
| [`checkin-industrial-docs`](https://github.com/checkin-industrial/checkin-industrial-docs) | Wiki + apresentação |
