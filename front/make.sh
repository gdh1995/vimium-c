#!/usr/bin/env bash
set -o noglob

[ -d front ] && cd front

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
if [ $newer == 1 ]; then
  MSYS2_ARG_CONV_EXCL='s|' \
  sed 's|vomnibar\.js|chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/front/\0|' \
      "$VOMNIBAR" > "$TMP_VOMNIBAR/$VOMNIBAR"
fi

input="manifest.json $TMP_VOMNIBAR/$VOMNIBAR ../LICENSE.txt ../README.md"
for i in $(grep -o 'icon.*\.png' manifest.json); do
  input="$input ../icons/$i"
done

INCLUDE_DOT_FILES=true \
IN_DIST= WITH_MAP= \
NOT_IGNORE_FRONT=true \
ZIP_FLAGS='-FS -j' \
ZIP_INPUT=$input \
exec ../make.sh "$@"
