/**
 * API pública do motor. O Turmeo (ou qualquer app) importa daqui:
 *  - tipos e documento: novoDoc, abrir, exportar, deV0/paraV0
 *  - geração: gerar, regerar, remobiliar, sugerirExtras, MODELOS
 *  - edição: comandos puros + Historico (desfazer/refazer)
 *  - regras: validar, alcance, caminho, assentosAndar
 *  - desenho: desenharAndar / desenharSala (canvas 2D, pixel art 16 px)
 *  - extensão: registrarMovel, registrarPiso, registrarModelo
 *  - editor pronto: <Editor> (React)
 */
export * from './motor/tipos'
export { VERSAO, novoDoc, abrir, exportar } from './motor/doc'
export { deV0, paraV0, originalV0, V0, type TurmeoV0 } from './motor/migrar'
export { gerar, regerar, remobiliar, planejar, empacotar, D, CORR, ALTURA, MAX_LARGURA, type Entrada, type Resultado } from './motor/gerador'
export { MODELOS, CORES, modelo, registrarModelo, sugerirExtras, type Modelo } from './motor/modelos'
export { autoAtribuir, pessoasExemplo } from './motor/pessoas'
export * as cmd from './motor/comandos'
export { Historico, Recusa, type Cmd } from './motor/comandos'
export { validar, validarAndar, erros } from './motor/validar'
export { alcance, caminho, assentosAndar, corredorGrid, walkGrid, salaEm } from './motor/andar'
export { KINDS, PISOS, isDesk, registrarMovel, registrarPiso, type Kind } from './motor/catalogo'
export { hitTest, bbox, mesas, check, reach } from './motor/sala'
export { mulberry32, hash } from './motor/rng'
export { T } from './render/base'
export { TOKENS_PADRAO, usarTokens, type Tokens } from './render/tokens'
export { EMBLEMAS, EMBLEMA_KEYS } from './render/bandeira'
export { desenharAndar, fundoAndar, passadeira, type OpAndar, type Selecao } from './render/andar'
export { desenharSala, fundoSala, desenharVaga, type OpSala } from './render/sala'
