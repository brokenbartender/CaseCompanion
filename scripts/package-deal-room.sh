#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/release_artifacts/v1.3.0_Deal_Room"

mkdir -p "$OUT_DIR"

copy_if_exists() {
  local src="$1"
  local dest="$2"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
  else
    echo "Missing: $src" >&2
  fi
}

copy_if_exists "$ROOT_DIR/legal/PATENT_DRAFT_HALLUCINATION_KILLER.md" "$OUT_DIR/PATENT_DRAFT_HALLUCINATION_KILLER.md"
copy_if_exists "$ROOT_DIR/docs/deepening/SEMANTIC_ADVERSARY_WHITE_PAPER.md" "$OUT_DIR/SEMANTIC_ADVERSARY_WHITE_PAPER.md"
copy_if_exists "$ROOT_DIR/docs/deepening/CRYPTO_SHREDDING_PROTOCOL.md" "$OUT_DIR/CRYPTO_SHREDDING_PROTOCOL.md"
copy_if_exists "$ROOT_DIR/docs/api/openapi_v1.3.0.yaml" "$OUT_DIR/openapi_v1.3.0.yaml"
copy_if_exists "$ROOT_DIR/LexiPro_Technical_Architecture.pdf" "$OUT_DIR/LexiPro_Technical_Architecture.pdf"

echo "Deal room packaged at $OUT_DIR"
