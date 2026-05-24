// Constantes + helpers de Status da Empresa, mantidos fora dos arquivos
// de componente (ManagementScreen/Map) por causa do react-refresh:
// arquivos exportados pra Fast Refresh devem exportar apenas componentes;
// const/type/funcoes ao lado quebram o HMR.
//
// Reflete StatusEmpresa do backend (int enum). Painel mantem como numero
// pra evitar serializacao customizada no .NET.

export const STATUS = {
  Ativo: 1,
  Inativo: 2,
  AguardandoRevisao: 3,
} as const;

export type StatusEmpresa = 1 | 2 | 3;

export function statusLabel(status: StatusEmpresa): string {
  switch (status) {
    case STATUS.Ativo:
      return "Ativa";
    case STATUS.Inativo:
      return "Inativa";
    case STATUS.AguardandoRevisao:
      return "Aguardando revisão";
  }
}

export function statusBadgeClass(status: StatusEmpresa): string {
  switch (status) {
    case STATUS.Ativo:
      return "tipo-badge ativa";
    case STATUS.Inativo:
      return "tipo-badge inativa";
    case STATUS.AguardandoRevisao:
      return "tipo-badge aguardando";
  }
}
