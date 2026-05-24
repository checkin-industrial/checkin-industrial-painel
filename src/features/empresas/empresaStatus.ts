// Constantes + helpers de Status da Empresa, mantidos fora dos arquivos
// de componente (ManagementScreen/Map) por causa do react-refresh:
// arquivos exportados pra Fast Refresh devem exportar apenas componentes;
// const/type/funcoes ao lado quebram o HMR.
//
// Reflete StatusEmpresa do backend (enum serializado como string camelCase
// via JsonStringEnumConverter). Antes do PR coordenado API+painel, eram ints.

export const STATUS = {
  Ativo: "ativo",
  Inativo: "inativo",
  AguardandoRevisao: "aguardandoRevisao",
} as const;

export type StatusEmpresa = (typeof STATUS)[keyof typeof STATUS];

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
