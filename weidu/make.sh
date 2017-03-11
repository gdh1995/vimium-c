#!/usr/bin/env bash
set -o noglob

output=$1
key=$2
crx=$3
ignored=${4:-img/bg* img/tab*}
shift && shift && shift && shift

[ -d weidu ] && cd weidu

IN_DIST= WITH_MAP= \
exec ../make.sh "$output" "$key" "$crx" "$ignored" "$@"
