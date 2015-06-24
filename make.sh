#/bin/sh

if [ -z "$1" ]; then
OUTPUT=/wo/vimium++_1.49.crx
else
OUTPUT="$1"
fi
shift

if [ "$OUTPUT" != "-" -a -f "$OUTPUT" ]; then
ARGS="-u $*"
else
ARGS="$*"
fi

zip -roX -MM $ARGS "$OUTPUT" . -x ".*" "*.sh" "weidu/*" "test/*"
