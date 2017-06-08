#!/usr/bin/env bash
set -o noglob

if [ -d weidu ]; then ZIP_BASE=weidu/ ; script_base= ; else ZIP_BASE= ; script_base=../ ; fi

INCLUDE_DOT_FILES=
IN_DIST=
WITH_MAP=
ZIP_INPUT=
ZIP_IGNORE='img/bg* img/tab*'
. ${script_base}scripts/make.sh
