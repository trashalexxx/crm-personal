#!/usr/bin/env bash
# Instalación del CRM Personal en macOS o Linux.
# Uso:  bash instalar.sh     (después:  bash iniciar.sh)
set -euo pipefail
cd "$(dirname "$0")"

echo
echo "==============================================="
echo "  CRM Personal - Instalación"
echo "==============================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] No se encuentra Node.js."
  echo "        Instálalo desde https://nodejs.org (versión LTS) y repite."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "[ERROR] Node.js $NODE_MAJOR es demasiado antiguo. Hace falta la 18 o superior."
  exit 1
fi
echo "[OK] Node.js $(node -v)"
echo

echo "[1/5] Instalando dependencias del servidor…"
cd server
npm install --no-audit --no-fund

if [ -f .env ]; then
  echo "[2/5] Ya existe un fichero .env, se conserva el actual"
else
  echo "[2/5] Generando configuración con una clave de sesión única…"
  node -e "const fs=require('fs'),c=require('crypto');let e=fs.readFileSync('.env.example','utf8');e=e.replace('cambia-esto-por-una-cadena-larga-y-aleatoria',c.randomBytes(48).toString('hex'));fs.writeFileSync('.env',e);"
fi

echo "[3/5] Preparando la base de datos…"
npm run db:push

cd ../web
echo "[4/5] Instalando dependencias de la interfaz…"
npm install --no-audit --no-fund

echo "[5/5] Compilando la interfaz…"
npm run build

cd ..
echo
echo "==============================================="
echo "  Instalación terminada"
echo "==============================================="
echo
echo "  Ejecuta:  bash iniciar.sh"
echo "  Se abrirá en http://localhost:4000"
echo
