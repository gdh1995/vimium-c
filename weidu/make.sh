#!/bin/sh
set -o noglob

if [ -z "$1" ]; then
OUTPUT=weidu_4.83.zip
else
OUTPUT="$1"
fi
shift

if [ "$OUTPUT" != "-" -a -f "$OUTPUT" ]; then
ARGS="-u $*"
else
ARGS="$*"
fi

zip -roX -MM $ARGS "$OUTPUT" . -x ".*" "*.sh" "img/bg/*" "img/tab_*" "*.zip" "*.crx"
