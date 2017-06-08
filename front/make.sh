#!/usr/bin/env bash
set -o noglob

if [ -d front ]; then ZIP_BASE=front/ ; script_base= ; else ZIP_BASE= ; script_base=../ ; fi

VOMNIBAR=vomnibar.html
if [ -z "$TMP_VOMNIBAR" ]; then
  TMP_VOMNIBAR=/tmp/vomnibar_$RANDOM
fi
newer=1
if [ ! -d "$TMP_VOMNIBAR" ]; then
  mkdir -p "$TMP_VOMNIBAR"
elif [ "$VOMNIBAR" -ot "$TMP_VOMNIBAR/$VOMNIBAR" ]; then
  newer=0
fi
if [ $newer = 1 ]; then
  HOST_EXT_ID=$(grep -m1 -o 'chrome-extension://[a-z]*' ${ZIP_BASE}manifest.json)
  MSYS2_ARG_CONV_EXCL='s|' \
  sed 's|vomnibar\.js|'$HOST_EXT_ID'/front/\0|' "${ZIP_BASE}$VOMNIBAR" > "$TMP_VOMNIBAR/$VOMNIBAR"
fi

input="manifest.json $TMP_VOMNIBAR/$VOMNIBAR ../LICENSE.txt ../README.md"
for i in $(grep -o 'icon.*\.png' ${ZIP_BASE}manifest.json); do
  input="$input ../icons/$i"
done

INCLUDE_DOT_FILES=true
IN_DIST=
NOT_IGNORE_FRONT=true
WITH_MAP=
ZIP_FLAGS='-FS -j'
ZIP_IGNORE=
ZIP_INPUT=$input
. ${script_base}make.sh
