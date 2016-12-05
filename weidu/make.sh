#!/usr/bin/env bash
set -o noglob

output=$1
key=$2
crx=$3
ignored=${4:-img/bg* img/tab*}
shift && shift && shift && shift

exec ../make.sh "$output" "$key" "$crx" "$ignored" "$@"
