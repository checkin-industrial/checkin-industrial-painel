# Feature: triagem

Tela admin de triagem de candidatos importados via Google Maps (api#25). Substitui
o fluxo antigo onde imports criavam Empresas direto com `Status=AguardandoRevisao`.

## Conceito

Cada candidato tem **3 estados independentes** (um por destino possível):

- `empresaStatus` + `empresaId` + `empresaDecididoEm`
- `pontoStatus` + `pontoInstitucionalId` + `pontoDecididoEm`
- `telefoneStatus` + `telefoneUtilId` + `telefoneDecididoEm`

Cada um pode estar `pendente | aprovado | rejeitado`. Admin decide individualmente,
independente entre destinos. Ex: candidato "Hotel ABC" pode virar **Empresa**
(hotel é negócio) **e** **Ponto Institucional** (atrativo turístico) **e** ser
rejeitado como Telefone Útil (não é serviço público).

## Componentes

| Arquivo | Função |
|---|---|
| [TriagemImportacoesScreen.tsx](TriagemImportacoesScreen.tsx) | Shell: query + filtro + lista de candidates + handler de reject |
| [components/PromoteToEmpresaModal.tsx](components/PromoteToEmpresaModal.tsx) | Modal pra promoção a Empresa (CNPJ/CNAE/setor admin completa) |
| [components/PromoteToPontoModal.tsx](components/PromoteToPontoModal.tsx) | Modal pra promoção a Ponto (tipo/descrição/cor admin escolhe) |
| [components/PromoteToTelefoneModal.tsx](components/PromoteToTelefoneModal.tsx) | Modal pra promoção a Telefone (categoria admin escolhe) |

A row do candidato + sub-componente `DestinoActions` ficam **inline** em
`TriagemImportacoesScreen.tsx` enquanto soma <100 linhas. Extrair se crescer.

## Endpoints consumidos

Sob `/api/import/candidates`:

| Verbo | Path | Quando |
|---|---|---|
| GET | `/?status=...` | Carrega lista (filtro por destino com algum status) |
| POST | `/{id}/promote-empresa` | Body: `EmpresaCreatePayload` (reusa types de empresas) |
| POST | `/{id}/promote-ponto` | Body: `PontoInstitucionalPayload` |
| POST | `/{id}/promote-telefone` | Body: `{ nome, categoria (int), telefone }` |
| POST | `/{id}/reject?destino=empresa\|ponto\|telefone` | Soft, audit-friendly |

Todos requerem `X-Api-Key` (admin-only).

## Pré-preenchimento dos modals

Cada modal pre-popula o que dá com dados do candidato:

- **Empresa**: `nomeFantasia=razaoSocial=candidate.nome`, `endereco`, `telefone`,
  `cep` (do CepOrigem), `latitude/longitude`. Admin completa CNPJ/CNAE/setor.
- **Ponto**: `nome`, `endereco`, `latitude/longitude`, `contatoTelefone`. Tipo
  é sugerido por heurística simples (hotel→Hotel, restaurant→Serviço, default Comércio).
- **Telefone**: `nome`, `telefone`. Categoria é sugerida por heurística
  (hotel/lodging→HoteisPousadas, default EmergenciaServicosPublicos).

Heurísticas existem só pra reduzir cliques — admin sempre pode trocar.

## Decisões terminais

API retorna **409 Conflict** ao tentar re-decidir um destino já decidido.
Pra desfazer, o admin deleta a entidade-fim no CRUD próprio dela (Empresa,
Ponto, Telefone). O candidato ficará marcado como "aprovado" no histórico
mas a entidade real não existe mais — UI da Triagem mostra isso pelos
`*Id` apontando pra registros deletados/inativos.

## Gotchas

- **Status do enum**: `CandidatePromotionStatus` na API é serializado camelCase
  (`pendente | aprovado | rejeitado`). O type TS em [types.ts](types.ts) usa
  essas mesmas strings.
- **Filtros**: `?status=pendente` retorna candidates com **algum** destino
  pendente (não os 3). Isso é intencional — admin geralmente quer ver tudo
  que ainda precisa de decisão.
- **Telefone categoria**: enum int na API (1=Emergência, 2=Transporte, 3=Hotéis).
  Modal usa int direto no body, não string.
