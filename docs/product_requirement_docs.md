# Turmeo motor de layout: requisitos

## Objetivo
Motor de criação de escritórios em pixel art que qualquer empresa usa para montar o próprio
espaço: setores, salas, andares, móveis, pessoas e tema. Vira o editor oficial do Turmeo.

## Referências de mercado (como outros fazem)
- Gather / WorkAdventure: mapa em tiles, objetos com colisão, editor por camadas (chão, parede, objeto).
- Floor planners (Floorplanner, Planner 5D): wizard → layout automático → ajuste manual.
- Editores de nível (Tiled, LDtk): pincel de piso, ferramenta de retângulo, inspetor de propriedades, undo/redo.
- Space management (OfficeSpace, Robin): pessoas ↔ mesas, setores com cor, relatório de problemas.

## Requisitos
1. **Documento versionado** (JSON v1), com import automático do formato v0 do Turmeo e export de volta.
2. **Gerador determinístico** por semente: setores → salas → andares, com corredor, portas, móveis e mesas; travar salas e regerar o resto.
3. **Modelos** (Escritório, Startup, Resort/hotel, Agência) com tema, pisos, decoração e setores sugeridos; extensível por registro.
4. **Edição por comandos puros** com desfazer/refazer e recusas explicadas (sobreposição, fora do andar, porta inválida).
5. **Validação**: toda mesa alcançável a partir da entrada; avisos de sala sem porta, pessoa sem mesa, etc.
6. **Editor**: ferramentas selecionar, móvel, piso, divisória, nova sala, porta, vidro, apagar, entrada; zoom, grade, pan, atalhos.
7. **Painéis**: inspetor (mesa/objeto/sala/andar), catálogo filtrável por tema, setores, pessoas (atribuir mesa, chefia), problemas, tema de cores.
8. **Assistente**: empresa → modelo → setores → pessoas → salas comuns → resultado com "outra opção".
9. **Multi-tenant**: nada da Village fixo no motor; marca vem dos tokens do tema.

## Fora do escopo agora
Integração no `escritorio-village`, sincronização com Supabase, colaboração em tempo real.

## Princípio: fácil pra quem não é técnico
O motor é usado por outras pessoas pra criarem o próprio ambiente. Toda tela nova passa por:
leigo consegue sem explicação? Linguagem do dia a dia (nada de "v0", "semente", "tile"), primeiro uso
guiado pelo assistente, poucas opções visíveis por vez, avançado escondido, erro explicado com o que fazer.
