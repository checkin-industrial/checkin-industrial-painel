# Feature: telefonesUteis

Cards publicos de telefones uteis (emergencia, hoteis, transporte) + CRUD admin.

## Componentes

| Arquivo | Funcao | Tipo |
|---|---|---|
| `TelefonesUteisCardsScreen.tsx` | Grid de cards publico agrupados por categoria | Publico |
| `TelefonesUteisManagementScreen.tsx` (507 linhas) | CRUD admin | **Requer X-Api-Key** |

## Contratos com a API

Sob `/api/telefones-uteis`:

| Verbo | Path | Auth |
|---|---|---|
| GET | `/` | anonimo |
| GET | `/{id}` | anonimo |
| POST | `/` | **X-Api-Key** |
| PUT | `/{id}` | **X-Api-Key** |
| DELETE | `/{id}` | **X-Api-Key** |

## Gotchas

- **3 categorias**: EmergenciaServicosPublicos, TransporteCultura, HoteisPousadas. Como enum int na API + label PT-BR no painel.
- **OrdemExibicao**: idem PontosInstitucionais — controla ordem visual.
- **Ativo**: bool opcional. CardsScreen ja filtra `Ativo == true`? Verificar.
- Feature mais simples, bom template pra novas features de CRUD.
