# Contexto ativo (2026-10-10)

## Estado
- Motor + render + editor + assistente prontos. tsc limpo, 28 testes, build ok.
- Roteiros CDP (`provas/r1..r3.json`) validaram: assistente completo, selecionar/arrastar mesa, Ctrl+Z,
  apagar sala + desfazer, recusa de sala sobreposta, novo andar, todas as abas, catálogo com miniaturas.
- Tela inicial estilo Trello + criar numa tela + editor simplificado (commit ee0df55); `provas/r4.json` valida local e no ar.
- No ar: https://vigattibla.github.io/turmeo-motor/ (push no main publica).

## Próximo
- Usuário testa e pede ajustes/itens novos no catálogo e modelos.
- Quando liberar: integrar no `escritorio-village` (sala de criação usa `<Editor>` e `abrir/paraV0`), via branch e PR lá.

## Pendências conhecidas
- Escritórios ficam só no navegador (localStorage); sem conta/nuvem ainda.
- Painel Pessoas ainda tem cara de técnico (checkbox/estrela/chefia); simplificar se o usuário pedir.
- Testes de UI são roteiros, não asserts automáticos.
- Pessoas: arrastar pessoa pra mesa direto no canvas ainda não existe (só pelo select do inspetor).
