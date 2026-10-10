/**
 * Esquema do documento do motor (v1). Tudo é JSON puro: dá pra salvar, versionar e mandar pro Supabase.
 *
 * Coordenadas em tiles (16 px). Sala tem origem própria (x, y) dentro do andar:
 *  - linhas 0-1 = parede alta de cima (onde ficam quadros, janelas); h-1 = parede de baixo
 *  - colunas 0 e w-1 = paredes laterais
 *  - miolo andável: x ∈ [1, w-2], y ∈ [2, h-2]
 * Corredor = tudo do andar que não é sala; borda do andar fora de sala vira parede.
 */
import type { Tokens } from '../render/tokens'

/** n = cima, s = baixo, l = leste (direita), o = oeste (esquerda) */
export type Lado = 'n' | 's' | 'l' | 'o'
/** porta de 2 tiles; pos = x local (n/s) ou y local (l/o) do primeiro tile */
export type Porta = { lado: Lado; pos: number }
/** móvel; d = número da mesa (único na sala), mesa da chefia = CHEFE */
export type Obj = { id: number; k: string; x: number; y: number; d?: number }
export const CHEFE = -1

export type TipoSala = 'setor' | 'vendas' | 'reuniao' | 'copa' | 'recepcao' | 'foco' | 'livre'
export const TIPOS: Record<TipoSala, string> = {
  setor: 'Setor', vendas: 'Vendas (baias)', reuniao: 'Reunião', copa: 'Copa', recepcao: 'Recepção', foco: 'Foco', livre: 'Livre',
}

export type Sala = {
  id: string; nome: string; tipo: TipoSala
  /** setor dono (id); sem setor = sala comum */ setor?: string
  x: number; y: number; w: number; h: number
  piso: string[][]; div: boolean[][]; objs: Obj[]
  portas: Porta[]
  /** lados com parede de vidro */ vidro?: Lado[]
  /** gerar de novo não mexe nesta sala */ travada?: boolean
}

export type Corredor = {
  piso: string
  /** móveis do corredor, em tiles do andar */ objs: Obj[]
  /** passadeira (tapete da marca); null = sem */ faixa?: { x: number; y: number; w: number; h: number } | null
}

export type Andar = {
  id: string; nome: string; w: number; h: number
  salas: Sala[]; corredor: Corredor
  /** onde a pessoa chega no andar (elevador/escada), tile do corredor */ entrada: { x: number; y: number }
}

export type Setor = {
  id: string; nome: string; cor: string
  /** emblema da bandeira (render/bandeira.ts) */ emblema?: string | null
  /** quantas pessoas (quando não tem lista nominal) */ pessoas: number
  tipo: 'setor' | 'vendas'
  /** tem chefia (mesa grande) */ lider?: boolean
}

export type Pessoa = {
  id: string; nome: string; setor: string
  chefe?: boolean
  mesa?: { sala: string; d: number } | null
}

export type Tema = Tokens

export type Doc = {
  v: 1
  id: string
  empresa: { nome: string; logo?: string | null }
  tema: Tema
  modelo: string
  seed: number
  setores: Setor[]
  pessoas: Pessoa[]
  andares: Andar[]
}

export type Problema = {
  nivel: 'erro' | 'aviso'
  cod: string
  msg: string
  andar?: string; sala?: string; obj?: number; x?: number; y?: number
}
