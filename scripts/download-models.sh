#!/usr/bin/env bash
# Downloads Apple's MobileCLIP-S1 CoreML packages (image + text encoders)
# and the CLIP tokenizer resources used by the snap-vision Swift helper.
#
# ~85MB total. Re-runs are idempotent — existing files are skipped.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODELS_DIR="$ROOT/native/models"
RESOURCES_DIR="$ROOT/native/snap-vision/Resources"
HF_BASE="https://huggingface.co/apple/coreml-mobileclip/resolve/main"
APPLE_TOKENIZER_BASE="https://raw.githubusercontent.com/apple/ml-mobileclip/main/ios_app/MobileCLIPExplore/Resources"

mkdir -p "$MODELS_DIR" "$RESOURCES_DIR"

fetch() {
  local url="$1"
  local dest="$2"
  if [[ -f "$dest" ]]; then
    echo "  skip: $(basename "$dest")"
    return
  fi
  echo "  fetch: $(basename "$dest")"
  mkdir -p "$(dirname "$dest")"
  curl -sSL "$url" -o "$dest"
}

echo "→ MobileCLIP S1 image encoder"
for part in "Manifest.json" "Data/com.apple.CoreML/model.mlmodel" "Data/com.apple.CoreML/weights/weight.bin"; do
  fetch "$HF_BASE/mobileclip_s1_image.mlpackage/$part" "$MODELS_DIR/mobileclip_s1_image.mlpackage/$part"
done

echo "→ MobileCLIP S1 text encoder"
for part in "Manifest.json" "Data/com.apple.CoreML/model.mlmodel" "Data/com.apple.CoreML/weights/weight.bin"; do
  fetch "$HF_BASE/mobileclip_s1_text.mlpackage/$part" "$MODELS_DIR/mobileclip_s1_text.mlpackage/$part"
done

echo "→ CLIP tokenizer resources"
fetch "$APPLE_TOKENIZER_BASE/clip-merges.txt" "$RESOURCES_DIR/clip-merges.txt"
fetch "$APPLE_TOKENIZER_BASE/clip-vocab.json" "$RESOURCES_DIR/clip-vocab.json"

echo "Done."
