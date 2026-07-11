#!/usr/bin/env bash
set -euo pipefail

DB_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/racing-manager"
DB_PATH="$DB_DIR/racing-manager.duckdb"

pkill -f "ELECTRON_DEV=1 electron" 2>/dev/null || true
pkill -f "electron \." 2>/dev/null || true
sleep 0.5

rm -f "$DB_PATH" "${DB_PATH}.wal"

echo "Removed: $DB_PATH"
