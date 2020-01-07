#!/usr/bin/env bash

VER=
FLAGS=
OTHER_EXT=
OTHER_ARGS=
GUD=${GUD:-/r/TEMP/GUD}
WORKING_DIR=${WORKING_DIR:-/r/working}
VC_ROOT=
DIST=0
UBO=0
HOME_PAGE=
default_vc_root=/e/Git/weidu+vim/vimium-c

function wp() {
  local dir=${2}
  test "${dir::5}" == "/mnt/" && dir=${dir:4} ||
  test "${dir::10}" == "/cygdrive/" && dir=${dir:9}
  if test "${dir::1}" != "/" -o "${dir:2:1}" != "/"; then
    dir=$($REALPATH -m "$dir")
  else
    local win_dir=${dir:1:1}
    dir=${win_dir^}:${dir:2}
  fi
  declare -g $1=${dir}
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
  leg|legacy|leagcy|--legacy|--leagcy)
    FLAGS=$FLAGS" --disable-javascript-harmony-shipping"
    shift
    ;;
  test|--test) # no the "Disable developer mode extensions" dialog, but add an extra infobar
    OTHER_ARGS=$OTHER_ARGS" --enable-automation"
    shift
    ;;
  zh|cn|zh-cn|zh-CN|--zh|--cn|--zh-cn|--zh-CN)
    FLAGS=$FLAGS" --lang=zh-CN"
    shift
    ;;
  en|en-us|en-US|--en|--en-us|--en-US)
    FLAGS=$FLAGS" --lang=en-US"
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
  ub|ubo)
    UBO=1
    shift
    ;;
  only|--only)
    exit 0
    ;;
  [3-9][0-9]|cur|wo|prev|[1-9a-f][1-9a-f][1-9a-f][1-9a-f][1-9a-f][1-9a-f]*) # ver
    VER=$1
    shift
    ;;
  --*)
    OTHER_ARGS=$OTHER_ARGS" $1"
    shift
    ;;
  *://*|about:*|chrome:*)
    HOME_PAGE=$1
    shift
    ;;
  *)
    if test -d "$1" && test -f "$1/manifest.json"; then
      VC_ROOT=$1
      shift
    else
      echo "Unknown arg: $1" >&2
      break
    fi
    ;;
esac
done

if test -f "/usr/bin/env.exe"; then
  RUN=/usr/bin/start2.exe
  REALPATH=/usr/bin/cygpath.exe
else
  RUN=$(which env.exe)' start2.exe'
  REALPATH=/bin/wslpath
fi

dir=$(/usr/bin/realpath "${BASH_SOURCE[0]}")
dir=${dir%/*}
if test -f "$dir"/Chrome/chrome.exe; then
  CHROME_ROOT=$dir
  VC_ROOT=${VC_ROOT:-$default_vc_root}
else
  CHROME_ROOT='/d/Program Files/Google'
  VC_ROOT=${VC_ROOT:-${dir%/*}}
fi
if test -z "$VER"; then
  VER_MIN=63
  for ((i=99;i>=VER_MIN;i--)); do
    if test -f "$WORKING_DIR/$i/chrome.exe"; then
      VER=$i; break
    fi
  done
if test -z "$VER" && test -f "$WORKING_DIR"/Chrome-bin/chrome.exe; then
  VER=wo
fi
test "$VER" == cur && VER=
if test "$VER" == wo; then
  EXE=$WORKING_DIR/Chrome-bin/chrome.exe
else
  EXE=$WORKING_DIR/${VER:-cur}/chrome.exe
  test -f "$EXE" || EXE=$CHROME_ROOT/${VER:-Chrome}/chrome.exe
fi
VC_ROOT="$(/usr/bin/realpath ${VC_ROOT})"
if test $DIST -gt 0; then
  VC_EXT=${VC_ROOT}/dist
  dir=$(/usr/bin/realpath "${VC_EXT}")
  wp vc_ext_w "$dir"
  if ! test -f ${dir}/manifest.json; then
    echo -e "No dist extension: "$vc_ext_w >&2
  fi
else
  VC_EXT="$VC_ROOT"
  wp vc_ext_w "$VC_EXT"
fi
if test $UBO -le 0; then UBO=
elif test "$VER" == wo -o "$VER" == prev || test ${VER:-99} -ge 45; then
  UBO=${VC_ROOT}/../uBlock/dist/build/uBlock0.chromium
  if test -d "$UBO"; then
    wp UBO "${UBO}"
    OTHER_EXT=${OTHER_EXT},${UBO}
  fi
fi

exe_w=$($REALPATH -m "$EXE")
if ! test -f "$EXE"; then
  echo -E "No such a file: "$exe_w >&2
  exit 1
fi
if test -n "$VER" -o "$CHROME_ROOT" == '/d/Program Files/Google'; then
  rm -f "${EXE%/*}/default_apps/"* "${EXE%/*}/"[0-9]*"/default_apps/"*
fi

dir=${GUD}; dir=${dir#/}; gud_w=${dir%%/*}; dir=${dir#[a-z]}
gud_w=${gud_w^}:${dir}

test -d "$GUD" || mkdir -p "$GUD" || exit $?
test -d "$WORKING_DIR" && cd "$WORKING_DIR" 2>/dev/null || cd "${EXE%/*}"

# Refer: https://peter.sh/experiments/chromium-command-line-switches/
echo -E Run: "${exe_w}" at ${gud_w} with "${vc_ext_w}"
$RUN "$EXE" \
  --user-data-dir=${gud_w} \
  --load-extension=${vc_ext_w}${OTHER_EXT} \
  --homepage ${HOME_PAGE:-chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/pages/options.html} \
  --disable-office-editing-component-extension \
  --disable-extensions-file-access-check \
  --disable-component-update \
  $OTHER_ARGS \
  --start-maximized $FLAGS "$@"
