#!/usr/bin/env bash
# Gera docs/manual-usuario.pdf a partir do manual em Markdown.
# Requisitos: pandoc + Google Chrome (ou Edge) instalados.
# Uso: bash docs/build-pdf.sh
set -euo pipefail

cd "$(dirname "$0")"   # entra em docs/

echo "1/2 — Markdown -> HTML (imagens e CSS embutidos)..."
pandoc manual-usuario.md \
  -f gfm \
  --standalone --embed-resources \
  -c assets/manual-print.css \
  -o manual-usuario.html 2>/dev/null

echo "2/2 — HTML -> PDF (Chrome headless)..."
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -x "$CHROME" ] || CHROME="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

DIR_WIN="$(pwd -W 2>/dev/null || pwd)"
HTML_ABS="$DIR_WIN/manual-usuario.html"
PDF_ABS="$DIR_WIN/manual-usuario.pdf"
URL="file:///$(printf '%s' "$HTML_ABS" | sed 's/ /%20/g')"

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$PDF_ABS" "$URL"

echo "OK -> docs/manual-usuario.pdf"
