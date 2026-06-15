#!/usr/bin/env bash
# BookShelf™ - Ejemplo de exportación CSV de baneados.
#
# Requiere:
#   * backend corriendo en http://localhost:4000
#   * Credenciales de admin@bookshelf.app (admin123)
#
# Uso:
#   ./scripts/export_banned_example.sh

set -e

API="${API:-http://localhost:4000}"
EMAIL="${EMAIL:-admin@bookshelf.app}"
PASS="${PASS:-admin123}"

echo "Login como $EMAIL..."
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')

if [ -z "$TOKEN" ]; then
  echo "ERROR: no se obtuvo token. ¿Servidor activo?"; exit 1;
fi

echo "Descargando CSV..."
curl -s -X POST "$API/api/moderation/export-banned" \
  -H "Authorization: Bearer $TOKEN" -o banned_users.csv

echo "Listo: banned_users.csv ($(wc -c < banned_users.csv) bytes)."
