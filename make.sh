#/bin/sh
set -o noglob

if [ -z "$1" ]; then
OUTPUT=vimium++_1.51.crx
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
  "*/.*" "*.zip" "*.crx" "*template.json"
