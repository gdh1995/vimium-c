#/bin/sh

if [ -z "$1" ]; then
OUTPUT=/wo/weidu_4.80.crx
else
OUTPUT="$1"
fi
shift

if [ "$OUTPUT" != "-" -a -f "$OUTPUT" ]; then
ARGS="-u $*"
else
ARGS="$*"
fi

zip -r0oX -MM $ARGS "$OUTPUT" . -x ".*" "*.sh"
