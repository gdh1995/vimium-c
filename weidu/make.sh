#!/bin/sh
set -o noglob

if [ -z "$1" ]; then
OUTPUT=weidu_4.83.crx
else
OUTPUT="$1"
fi
shift

if [ "$OUTPUT" != "-" -a -f "$OUTPUT" ]; then
ARGS="-u $*"
else
ARGS="$*"
fi

zip -roX -MM $ARGS "$OUTPUT" . -x ".*" "*.sh" "img/bg/*" "img/tab_*" "*.crx" "*template.json"
