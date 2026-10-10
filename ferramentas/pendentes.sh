#!/usr/bin/env bash
# Mudanças no escritorio-village (layout/sala/móveis) desde a última passagem pro motor.
# uso: bash ferramentas/pendentes.sh [base]   (base padrão = ferramentas/base-escritorio.txt)
cd "$(dirname "$0")/.."
BASE=${1:-$(tr -d "
 " < ferramentas/base-escritorio.txt)}
cd D:/Projetos/escritorio-village || exit 1
git log --oneline --no-merges "$BASE"..HEAD -- src/office src/shop/catalog.ts \
  src/components/SalaEditor.tsx src/components/Game.tsx src/components/Bandeira.tsx src/components/Distribuir.tsx
git diff --stat "$BASE" -- src/office src/shop/catalog.ts src/components/SalaEditor.tsx \
  src/components/Game.tsx src/components/Bandeira.tsx src/components/Distribuir.tsx | tail -n 12
