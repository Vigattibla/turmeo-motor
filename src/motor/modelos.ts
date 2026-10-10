/** Modelos de empresa: cores, pisos, decoração e setores de exemplo. Dá pra registrar novos. */
import type { Tokens } from '../render/tokens'
import type { Setor, TipoSala } from './tipos'

export type Modelo = {
  id: string; nome: string; descricao: string
  tema: Tokens
  /** piso por tipo de sala (id de PISOS) */ pisos: Partial<Record<TipoSala, string>> & { padrao: string }
  /** 'pedra' = ladrilho do tema; senão id de PISOS */ corredor: string
  /** sala de vendas ganha o painel de quartos (hotelaria) */ painelQuartos: boolean
  extras: TipoSala[]
  /** enfeites que vão pelas bordas das salas */ decorSala: string[]
  /** quadros e coisas de parede */ arteParede: string[]
  decorCorredor: { cima: string[]; baixo: string[]; pontas: string }
  setores: Omit<Setor, 'id'>[]
}

/** cores pros setores, na ordem */
export const CORES = ['#2f6fdb', '#e2553f', '#2fa36b', '#f2a516', '#8a4fd8', '#e0389a', '#17a2b8', '#7a5c3e', '#5b6b7f', '#c9a227']

export const MODELOS: Record<string, Modelo> = {
  escritorio: {
    id: 'escritorio', nome: 'Escritório', descricao: 'Clássico corporativo: madeira, carpete e azul-marinho.',
    tema: { marca: '#1f2a44', destaque: '#f2b705', marcaClara: '#2a3858', marcaDetalhe: '#475a85', pedraA: '#e3dccf', pedraB: '#ddd5c6', rejunte: '#cdc3b1' },
    pisos: { padrao: 'madeira', reuniao: 'carpete', copa: 'ceramica', recepcao: 'xadrez' },
    corredor: 'pedra', painelQuartos: false, extras: ['recepcao', 'reuniao', 'copa'],
    decorSala: ['planta', 'arquivo', 'impressora', 'bebedouro'],
    arteParede: ['quadro-paisagem', 'calendario', 'relogio', 'arte', 'cartaz'],
    decorCorredor: { cima: ['banco-madeira', 'sofa'], baixo: ['canteiro', 'bebedouro'], pontas: 'planta' },
    setores: [
      { nome: 'Diretoria', cor: CORES[0], pessoas: 3, tipo: 'setor', lider: true },
      { nome: 'Financeiro', cor: CORES[2], pessoas: 5, tipo: 'setor', lider: true },
      { nome: 'Comercial', cor: CORES[1], pessoas: 8, tipo: 'vendas', lider: true },
      { nome: 'Operações', cor: CORES[3], pessoas: 7, tipo: 'setor', lider: true },
    ],
  },
  startup: {
    id: 'startup', nome: 'Startup', descricao: 'Turmeo Recreio: cobalto e creme, pufe e fliperama.',
    tema: { marca: '#2440FF', destaque: '#FFF8EC', marcaClara: '#3a55ff', marcaDetalhe: '#7488ff', pedraA: '#f3ecdf', pedraB: '#ede4d4', rejunte: '#dccfb8' },
    pisos: { padrao: 'carpete', reuniao: 'madeira', copa: 'xadrez', foco: 'madeira', livre: 'grama' },
    corredor: 'pedra', painelQuartos: false, extras: ['reuniao', 'copa', 'foco', 'livre'],
    decorSala: ['pufe', 'planta', 'fliperama', 'bebedouro'],
    arteParede: ['neon', 'arte', 'relogio', 'cartaz', 'calendario'],
    decorCorredor: { cima: ['sofa', 'pufe'], baixo: ['canteiro', 'fliperama'], pontas: 'planta' },
    setores: [
      { nome: 'Produto', cor: CORES[0], pessoas: 6, tipo: 'setor', lider: true },
      { nome: 'Engenharia', cor: CORES[4], pessoas: 12, tipo: 'setor', lider: true },
      { nome: 'Growth', cor: CORES[5], pessoas: 6, tipo: 'vendas', lider: true },
      { nome: 'Design', cor: CORES[3], pessoas: 4, tipo: 'setor', lider: false },
    ],
  },
  resort: {
    id: 'resort', nome: 'Resort / hotel', descricao: 'Hotelaria: painel de quartos em vendas, coqueiro e espreguiçadeira.',
    tema: { marca: '#26324F', destaque: '#FFC600', marcaClara: '#2f3d63', marcaDetalhe: '#46578a', pedraA: '#e3dccf', pedraB: '#ddd5c6', rejunte: '#cdc3b1' },
    pisos: { padrao: 'madeira', copa: 'tijolo', recepcao: 'ceramica', livre: 'areia' },
    corredor: 'pedra', painelQuartos: true, extras: ['recepcao', 'reuniao', 'copa'],
    decorSala: ['planta', 'coqueiro', 'cooler', 'bebedouro'],
    arteParede: ['foto-piscina', 'quadro-paisagem', 'cartaz', 'calendario', 'relogio', 'arte'],
    decorCorredor: { cima: ['banco-madeira', 'sofa'], baixo: ['canteiro', 'bebedouro'], pontas: 'coqueiro' },
    setores: [
      { nome: 'Reservas', cor: CORES[1], pessoas: 10, tipo: 'vendas', lider: true },
      { nome: 'Recepção', cor: CORES[6], pessoas: 4, tipo: 'setor', lider: true },
      { nome: 'Marketing', cor: CORES[5], pessoas: 5, tipo: 'setor', lider: true },
      { nome: 'Financeiro', cor: CORES[2], pessoas: 4, tipo: 'setor', lider: true },
    ],
  },
  agencia: {
    id: 'agencia', nome: 'Agência', descricao: 'Criativa: rosa e roxo, café de verdade e quadro colorido.',
    tema: { marca: '#5b2a86', destaque: '#ff5fa2', marcaClara: '#6c3a99', marcaDetalhe: '#9a6cc4', pedraA: '#efe7ea', pedraB: '#e7dde2', rejunte: '#d6c8cf' },
    pisos: { padrao: 'madeira', reuniao: 'carpete', copa: 'xadrez', livre: 'carpete' },
    corredor: 'pedra', painelQuartos: false, extras: ['reuniao', 'copa', 'livre'],
    decorSala: ['planta', 'espresso', 'pufe', 'bebedouro'],
    arteParede: ['arte', 'menu-giz', 'neon', 'quadro-paisagem', 'relogio'],
    decorCorredor: { cima: ['sofa', 'bistro'], baixo: ['canteiro', 'vitrine-doces'], pontas: 'planta' },
    setores: [
      { nome: 'Atendimento', cor: CORES[1], pessoas: 5, tipo: 'vendas', lider: true },
      { nome: 'Criação', cor: CORES[5], pessoas: 8, tipo: 'setor', lider: true },
      { nome: 'Mídia', cor: CORES[4], pessoas: 4, tipo: 'setor', lider: true },
      { nome: 'Produção', cor: CORES[3], pessoas: 5, tipo: 'setor', lider: false },
    ],
  },
}
export const modelo = (id: string) => MODELOS[id] ?? MODELOS.escritorio
export const registrarModelo = (m: Modelo) => { MODELOS[m.id] = m }

/** salas comuns que fazem sentido pro tamanho da empresa */
export function sugerirExtras(pessoas: number, m: Modelo = MODELOS.escritorio): TipoSala[] {
  const out: TipoSala[] = ['reuniao']
  if (pessoas >= 8) out.push('copa')
  if (pessoas >= 15 && m.extras.includes('recepcao')) out.unshift('recepcao')
  if (pessoas >= 20 && m.extras.includes('foco')) out.push('foco')
  if (pessoas >= 40) out.push('reuniao')
  if (m.extras.includes('livre') && pessoas >= 12) out.push('livre')
  return out
}
