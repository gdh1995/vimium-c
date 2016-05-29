#!/bin/sh
set -o noglob

if [ -z "$1" ]; then
OUTPUT=vimium-plus_1.53.zip
else
OUTPUT="$1"
fi
shift

if [ "$OUTPUT" != "-" -a -f "$OUTPUT" ]; then
ARGS="-u $*"
else
ARGS="$*"
fi

zip -roX -MM $ARGS "$OUTPUT" . -x ".*" "*.sh" "weidu/*" "test*" \
  "*/.*" "*.zip" "*.crx"
