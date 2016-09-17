#!/bin/sh
set -o noglob

output="$1"
if [ -n "$output" -a ! -d "$output" ]; then :
else
  if [ -n "$output" -a -d "output" ]; then
    output="${output/\//}/"
  fi
  ver=`grep '"version"' manifest.json | awk -F '"' '{print $4}'`
  output="${output}"weidu_$ver.zip
fi

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
