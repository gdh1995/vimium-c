#!/bin/sh
set -o noglob

output="$1"
key="$2"
crx="$3"
ignored="$4"
if [ -z "$4" ]; then
  ignored="img/bg/*"
fi

shift
shift
shift
shift
exec ../make.sh "$output" "$key" "$crx" "$ignored" $*
