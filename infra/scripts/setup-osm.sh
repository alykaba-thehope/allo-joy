#!/usr/bin/env bash
# Télécharge les données OSM Guinée depuis Geofabrik et configure GraphHopper
set -euo pipefail

DATA_DIR="./infra/graphhopper/data"
OSM_URL="https://download.geofabrik.de/africa/guinea-latest.osm.pbf"
OSM_FILE="$DATA_DIR/guinea-latest.osm.pbf"

mkdir -p "$DATA_DIR"

echo "⬇️  Téléchargement OSM Guinée depuis Geofabrik..."
if [ ! -f "$OSM_FILE" ]; then
  curl -L -o "$OSM_FILE" "$OSM_URL"
  echo "✅ OSM Guinée téléchargé ($(du -sh "$OSM_FILE" | cut -f1))"
else
  echo "ℹ️  Fichier OSM déjà présent, skip."
fi

echo "🗺️  GraphHopper va indexer le graphe routier au premier démarrage."
echo "   Cela prend 2-5 minutes. Lancer: docker compose up graphhopper"
