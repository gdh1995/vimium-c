#!/usr/bin/env bash
set -o noglob

[ -d weidu ] && cd weidu

INCLUDE_DOT_FILES=
IN_DIST=
WITH_MAP=
ZIP_INPUT=
ZIP_IGNORE='img/bg* img/tab*'
. ../make.sh
