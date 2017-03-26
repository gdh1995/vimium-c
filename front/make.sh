#!/usr/bin/env bash
set -o noglob

[ -d front ] && cd front

icons=$(grep -o 'icon.*\.png' manifest.json)
input="manifest.json vomnibar.html ../LICENSE.txt ../README.md "$icons

IN_DIST= WITH_MAP= ZIP_INPUT=$input exec ../make.sh "$@"
