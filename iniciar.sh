#!/usr/bin/env bash
# Arranca el CRM Personal en macOS o Linux.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d server/node_modules ]; then
  echo "[ERROR] El CRM no está instalado aquí. Ejecuta primero: bash instalar.sh"
  exit 1
fi

if [ ! -f web/dist/index.html ]; then
  echo "[AVISO] Falta la interfaz compilada. Compilándola…"
  (cd web && npm run build)
fi

echo
echo "CRM Personal -> http://localhost:4000"
echo "Para detenerlo: Ctrl+C"
echo

cd server
npm run dev
