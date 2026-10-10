/** Tokens de cor do tema da empresa: o pintor lê daqui em vez de cor fixa. */
export type Tokens = {
  /** cor principal da marca (passadeira, lousas, placa) */ marca: string
  /** detalhe/realce (fio da passadeira, botões) */ destaque: string
  /** miolo da passadeira */ marcaClara: string
  /** cruzinhas da passadeira */ marcaDetalhe: string
  /** ladrilho do corredor, em xadrez */ pedraA: string; pedraB: string
  /** rejunte do corredor */ rejunte: string
}
export const TOKENS_PADRAO: Tokens = {
  marca: '#26324F', destaque: '#FFC600', marcaClara: '#2f3d63', marcaDetalhe: '#46578a',
  pedraA: '#e3dccf', pedraB: '#ddd5c6', rejunte: '#cdc3b1',
}
let atual: Tokens = TOKENS_PADRAO
export const tk = () => atual
export function usarTokens(t: Partial<Tokens> | undefined) { atual = { ...TOKENS_PADRAO, ...(t ?? {}) } }
