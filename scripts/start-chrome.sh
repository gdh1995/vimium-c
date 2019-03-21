#!/usr/bin/env bash

VER=
FLAGS=
OTHER_EXT=
OTHER_ARGS=
GUD=/r/TEMP/GUD
WORKING_DIR=/r/working
DIST=0

function wp() {
  local dir=${2#/}
  local win_dir=${dir%%/*}
  dir=${dir#[a-z]}
  declare -g $1=${win_dir^}:${dir}
}

while [[ $# -gt 0 ]]; do
case "$1" in
  clean|ckean|--clean)
    if test -e "$GUD"; then
      rm -rf "$GUD" || exit $?
      wp gud_w "$GUD"
      echo -E "Clean ${gud_w} : done."
    fi
    shift
    ;;
  exp|--exp)
    FLAGS=$FLAGS" --enable-experimental-web-platform-features --javascript-harmony --enable-experimental-canvas-features"
    shift
    ;;
  leg|legacy|--legacy)
    FLAGS=$FLAGS" --disable-javascript-harmony-shipping"
    shift
    ;;
  test|--test) # no the "Disable developer mode extensions" dialog, but add an extra infobar
    OTHER_ARGS=$OTHER_ARGS" --enable-automation"
    shift
    ;;
  dist|--dist)
    DIST=1
    shift
    ;;
  local|--local)
    DIST=0
    shift
    ;;
  only|--only)
    exit 0
    ;;
  [3-9][0-9]|cur|wo|prev) # ver
    VER=$1
    shift
    ;;
  *)
    break
    ;;
esac
done

if test -f "/usr/bin/env.exe"; then
  RUN=/usr/bin/start2.exe
  PATH=/usr/bin/cygpath.exe
else
  RUN=$(which env.exe)' start2.exe'
  PATH=/bin/wslpath
fi

dir=$(/usr/bin/realpath "${BASH_SOURCE[0]}")
dir=${dir%/*}
if test -f "$dir"/Chrome/chrome.exe; then
  CHROME_ROOT=$dir
  VC_ROOT=/e/Git/weidu+vim/vimium-c
else
  CHROME_ROOT='/d/Program Files/Google'
  VC_ROOT=${dir%/*}
fi
test "$VER" == cur && VER=
if test "$VER" == wo; then
  EXE=$WORKING_DIR/Chrome-bin/chrome.exe
else
  EXE=$WORKING_DIR/${VER:-cur}/chrome.exe
  test -f "$EXE" || EXE=$CHROME_ROOT/${VER:-Chrome}/chrome.exe
fi
if test $DIST -gt 0; then
  dir="$(/usr/bin/realpath ${VC_ROOT}/dist)"
  wp VC_EXT "$dir"
  if ! test -f ${dir}/manifest.json; then
    echo -e "No dist extension: "$VC_EXT >&2
  fi
else
  wp VC_EXT "$VC_ROOT"
fi
if test "$VER" == wo -o "$VER" == prev || test ${VER:-99} -ge 45; then
  ub=${VC_ROOT}/../uBlock/dist/build/uBlock0.chromium
  if test -d "$ub"; then
    wp ub "${ub}"
    OTHER_EXT=${OTHER_EXT},${ub}
  fi
fi

exe_w=$($PATH -m "$EXE")
if ! test -f "$EXE"; then
  echo -E "No such a file: "$exe_w >&2
  exit 1
fi

dir=${GUD}; dir=${dir#/}; gud_w=${dir%%/*}; dir=${dir#[a-z]}
gud_w=${gud_w^}:${dir}

test -d "$WORKING_DIR" && cd "$WORKING_DIR" 2>/dev/null || cd "${EXE%/*}"

# Refer: https://peter.sh/experiments/chromium-command-line-switches/
echo -E Run: "${exe_w}" at ${gud_w} with "${VC_EXT}"
$RUN "$EXE" \
  --user-data-dir=${gud_w} \
  --load-extension=${VC_EXT}${OTHER_EXT} \
  --homepage chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/pages/options.html \
  --disable-office-editing-component-extension \
  --disable-extensions-file-access-check \
  $OTHER_ARGS \
  --start-maximized $FLAGS "$@"