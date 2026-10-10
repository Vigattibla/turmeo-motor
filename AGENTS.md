# turmeo-motor

Motor de layout de escritório do Turmeo, separado do app. Gera e edita andares com setores,
salas, móveis e pessoas para qualquer empresa (multi-tenant). Depois entra no
`escritorio-village` como o editor de criação definitivo.

## Regras
- Repo público `Vigattibla/turmeo-motor`; push no `main` publica no GitHub Pages (`.github/workflows/pages.yml`).
  Integração no `escritorio-village` só por branch + PR.
- `D:/Projetos/escritorio-village` é referência (v0), somente leitura.
- Motor (`src/motor`) é TS puro, sem DOM. Desenho em `src/render` (canvas 2D). React só em `src/editor`.
- Toda edição é um `Cmd` puro (`Doc => Doc`) que lança `Recusa`; o editor passa pelo `Historico`.
- Novo móvel/piso/modelo entra por `registrarMovel` / `registrarPiso` / `registrarModelo`, sem mexer no núcleo.
- Doc tem versão (`VERSAO`); mudar formato = migração em `motor/doc.ts` + teste.

## Comandos (Bash; o cwd volta sozinho, sempre `cd` antes)
```
cd D:/Projetos/turmeo-motor
node node_modules/typescript/bin/tsc -p .          # tipos
node node_modules/vitest/vitest.mjs run            # testes
node node_modules/vite/bin/vite.js build           # build
node ferramentas/cdp.mjs provas/r2.json provas     # roteiro no Chrome headless + prints
```
Dev server: preview `motor` (porta 5190) no launch.json da pasta Designe Village Resort.

## Mapa
- `src/motor`: tipos, doc (abrir/exportar/migrar), gerador (planejar → empacotar → mobiliar), comandos + Historico, validar (alcance/caminho), modelos, catálogo, pessoas
- `src/render`: andar, sala, mesa, portas, bandeira, tokens (tema da empresa)
- `src/editor`: Editor (canvas + ferramentas), paineis (Inspetor/Catálogo/Setores/Pessoas/Problemas/Tema), Assistente (wizard), util
- `src/index.ts`: API pública
- `ferramentas/cdp.mjs`: driver CDP sem dependências pra testar a UI

Memory bank: este arquivo · `docs/product_requirement_docs.md` · `tasks/active_context.md`.
