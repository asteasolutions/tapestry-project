#!/bin/bash

##########################################################################################
#
# Helper script to convert Material icons to KTX2 textures.
#
# KTX2 textures are used in our Pixi.js code for efficient rendering of Tapestry item overlays.
# Whenever a new icon becomes necessary, download the PNG file (e.g. from fonts.google.com),
# run this script to convert it to KTX2, and add the output to the project (e.g. to client-core/src/assets/textures).
#
# The main purpose of the current script is to store the exact conversion parameters so that
# future conversions can be performed in an identical manner.
#
# Note that the KTX CLI is necessary for the conversion. It can be installed from the KhronosGroup GitHub.
# There are pre-built binary packages in the Releases section.
#
#  https://github.com/KhronosGroup/KTX-Software
#
#########################################################################################

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 icon1.png [icon2.png ...]" >&2
  exit 1
fi

for input in "$@"; do
  output="${input%.*}.ktx2"

  echo "Converting: $input -> $output"

  ktx create \
    --format R8G8B8A8_SRGB \
    --assign-tf srgb \
    --encode uastc \
    --uastc-quality 4 \
    --zstd 18 \
    --generate-mipmap \
    --mipmap-filter lanczos4 \
    --mipmap-wrap clamp \
    "$input" "$output"
done
