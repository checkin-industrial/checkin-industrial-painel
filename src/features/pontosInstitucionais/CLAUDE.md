# Feature: pontosInstitucionais

Cards publicos de pontos institucionais (educacao, hoteis, turismo, etc.) + tela de gestao admin com upload de imagens.

## Componentes

| Arquivo | Funcao | Tipo |
|---|---|---|
| `PontosInstitucionaisCardsScreen.tsx` | Grid de cards publico, com filtro por tipo | Publico |
| `PontosInstitucionaisManagementScreen.tsx` (1030 linhas) | CRUD + upload de logo/card/foto | **Requer X-Api-Key** |

## Contratos com a API

Sob `/api/pontos-institucionais`:

| Verbo | Path | Quem usa | Auth |
|---|---|---|---|
| GET | `/` | CardsScreen + ManagementScreen | anonimo |
| GET | `/{id}` | ManagementScreen (detalhe pro form) | anonimo |
| POST | `/` | ManagementScreen | **X-Api-Key** |
| PUT | `/{id}` | ManagementScreen | **X-Api-Key** |
| DELETE | `/{id}` | ManagementScreen | **X-Api-Key** |
| POST | `/upload-imagem` (multipart) | ManagementScreen | **X-Api-Key** |

## Gotchas

- **Upload de imagem**: 3 categorias (`logo`, `card`, `foto`). Limite 5 MB. Formato: JPG/PNG/WEBP/SVG. O backend retorna a URL relativa (ex: `/uploads/pontos-institucionais/logo/abc.png`) — usar `staticUrl()` do apiClient pra prefixar com `VITE_API_BASE`.
- **8 tipos de ponto**: Educacao, Comercio, Financeiro, Servico, SetorPrefeitura, PontoTuristico, Hotel, Ecoturismo. Como enum int na API + label PT-BR no painel.
- **OrdemExibicao**: campo opcional que controla ordem dos cards. `null` ordena depois dos com valor.
- **Cards publicos vs gestao**: ambos usam o mesmo endpoint GET (sem filtro de Ativo no atual). TODO: filtrar `Ativo == true` nos cards publicos.
