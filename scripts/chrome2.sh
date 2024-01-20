#!/usr/bin/env bash
VER=
FLAGS=
PAGE_FLAGS=
OTHER_EXT=
OTHER_ARGS=
NO_EXT=
USE_INSTALLED=0
UD=${TEST_USER_DATA}
DO_CLEAN=0
IS_EDGE=0
EDGE_VER=
CHROME_ROOT=
EXE=
RUN=
WAIT=0
WORKING_DIR=${WORKING_DIR:-/r/working}
VC_ROOT=
DIST=0
ALSO_VC=0
UBO=0
HOME_PAGE=
EXE_NAME=${EXE_NAME:-chrome.exe}
default_vc_root=/e/Git/weidu+vim/vimium-c
default_chrome_root=${default_chrome_root:-/d/Program Files/Google}
version_archives=/f/Application/Browser/chrome
export WSLENV=PATH/l
shopt -s extglob

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
  declare -g $1="${dir}"
}

while [[ $# -gt 0 ]]; do
case "$1" in
  clean|ckean|--clean)
    DO_CLEAN=1
    shift
    ;;
  exp|--exp)
    FLAGS=$FLAGS" --enable-experimental-web-platform-features --enable-experimental-canvas-features"
    FLAGS=$FLAGS" --javascript-harmony --js-flags=--harmony" # "--js-flags=--harmony" is used before C39
    shift
    ;;
  leg|legacy|leagcy|--legacy|--leagcy)
    FLAGS=$FLAGS" --disable-javascript-harmony-shipping"
    shift
    ;;
  enable|enable-blink)
    FLAGS=$FLAGS" --enable-blink-features="$2
    shift 2
    ;;
  disable|disable-blink)
    FLAGS=$FLAGS" --disable-blink-features="$2
    shift 2
    ;;
  dark)
    FLAGS=$FLAGS" --force-dark-mode"
    shift
    ;;
  force-dark|forcedark)
    PAGE_FLAGS=$PAGE_FLAGS",WebContentsForceDark"
    shift
    ;;
  --flags=*)
    PAGE_FLAGS=$PAGE_FLAGS",${1#--flags=}"
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
    # https://developer.chrome.com/webstore/i18n#localeTable
    FLAGS=$FLAGS" --lang=en-US"
    shift
    ;;
  fr|fr-fr|fr-FR|--fr|--fr-fr|--fr-FR)
    FLAGS=$FLAGS" --lang=fr"
    shift
    ;;
  dist|--dist)
    DIST=1
    VC_ROOT=
    shift
    ;;
  local|--local)
    DIST=0
    VC_ROOT=
    shift
    ;;
  installed|--installed)
    USE_INSTALLED=1
    VER=
    shift
    ;;
  installeddebug|installed-debug|--installed-debug)
    USE_INSTALLED=2
    VER=
    shift
    ;;
  installedonly|installed-only|--installed-only)
    USE_INSTALLED=3
    VER=
    shift
    ;;
  vc|--vc)
    ALSO_VC=1
    shift
    ;;
  novc|no-vc|--no-vc)
    NO_EXT=1
    shift
    ;;
  ub|ubo)
    UBO=1
    shift
    ;;
  only|--only)
    if test $DO_CLEAN -eq 1; then DO_CLEAN=2; fi
    shift
    ;;
  [3-9][0-9]|[1-9][0-9][0-9]*([0-9])|cur|wo|prev|[1-9a-f][1-9a-f][1-9a-f][1-9a-f][1-9a-f][1-9a-f]*) # ver
    VER=$1
    shift
    ;;
  edge-dev|--edge-dev)
    IS_EDGE=3
    shift
    ;;
  edge|--edge)
    IS_EDGE=1
    shift
    ;;
  zdsf)
    OTHER_ARGS=$OTHER_ARGS" --enable-use-zoom-for-dsf"
    shift
    ;;
  nozdsf|no-zdsf)
    OTHER_ARGS=$OTHER_ARGS" --enable-use-zoom-for-dsf=false"
    shift
    ;;
  wait|--wait)
    WAIT=1
    shift
    ;;
  --*)
    OTHER_ARGS=$OTHER_ARGS" $1"
    shift
    ;;
  *://*|about:*|chrome:*)
    HOME_PAGE=$HOME_PAGE" $1"
    shift
    ;;
  localhost*|*.localhost*)
    HOME_PAGE=$HOME_PAGE" http://$1"
    shift
    ;;
  -v|-x)
    shift
    set -x
    ;;
  *)
    if test -d "$1" && test -f "$1/manifest.json"; then
      VC_ROOT=$1
      shift
    else
      echo "Unknown arg: $1" >&2
      shift
    fi
    ;;
esac
done

if test -f "/usr/bin/env.exe"; then
  RUN=$(which start2.exe)
  REALPATH=/usr/bin/cygpath.exe
else
  RUN="$(which env.exe) start2.exe"
  REALPATH=/bin/wslpath
fi
test $WAIT -eq 1 && RUN=

if test $IS_EDGE -gt 0; then
  case "$IS_EDGE" in
  3) EDGE_VER=" Dev" ;;
  2) EDGE_VER=" Beta" ;;
  esac
  CHROME_ROOT="/c/Program Files (x86)/Microsoft/Edge${EDGE_VER}/Application"
  test -e "$CHROME_ROOT" || CHROME_ROOT="/c/Program Files (x86)/Microsoft/Edge Dev/Application"
  EXE=$CHROME_ROOT/msedge.exe
  UD=${UD:-/tmp/EUD}
fi
UD=${UD:-/tmp/GUD}
wp ud_w "$UD"
if test $DO_CLEAN -gt 0 -a -e "$UD"; then
  if test $USE_INSTALLED -ge 2; then
    echo -E "MUST NOT clean the default UserData folder"
    exit 1
  fi
  rm -rf "$UD" || exit $?
  echo -E "Clean ${ud_w} : done."
fi
if test $DO_CLEAN -eq 2; then exit 0; fi

if test $ALSO_VC -gt 0; then
  if test $DIST -gt 0; then
    wp deafault_vc_ext_w "$default_vc_root/dist"
    DIST=0
  else
    wp deafault_vc_ext_w "$default_vc_root"
  fi
  OTHER_EXT=${OTHER_EXT},${deafault_vc_ext_w}
  test -z "$VC_ROOT" && VC_ROOT=.
elif test -n "$VC_ROOT"; then
  DIST=0
elif test ${DIST:-0} -gt 0 && test -f "./dist/manifest.json"; then
  VC_ROOT=.
fi

dir=$(/usr/bin/realpath "${BASH_SOURCE[0]}")
dir=${dir%/*}
if test -f "$dir"/Chrome/${EXE_NAME}; then
  CHROME_ROOT=$dir
  VC_ROOT=${VC_ROOT:-$default_vc_root}
else
  CHROME_ROOT=${CHROME_ROOT:-$default_chrome_root}
  VC_ROOT=${VC_ROOT:-${dir%/*}}
fi
if test -z "$VER" -a $USE_INSTALLED -le 0 -a $IS_EDGE -eq 0 && test -f "$WORKING_DIR"/Chrome-bin/${EXE_NAME}; then
  VER=wo
fi
test "$VER" == cur && VER=
if test -n "$EXE"; then :
elif test "$VER" == wo; then
  EXE=$WORKING_DIR/Chrome-bin/${EXE_NAME}
else
  EXE=$WORKING_DIR/${VER:-cur}/${EXE_NAME}
  if test $USE_INSTALLED -ge 1 || ! test -f "$EXE"; then
    EXE=$CHROME_ROOT/${VER:-Chrome}/${EXE_NAME}
    if ! test -f "$EXE"; then
      if test -n "$VER" && find "$CHROME_ROOT/Chrome/" -name "${VER}.*" 2>/dev/null | grep . >/dev/null 2>&1; then
        EXE=$CHROME_ROOT/Chrome/${EXE_NAME}
      elif test -f "$CHROME_ROOT/${EXE_NAME}"; then
        EXE=$CHROME_ROOT/${EXE_NAME}
      fi
    fi
    if test -n "$VER" && ! test -e "$WORKING_DIR/${VER}"; then
      ARCHIVE="$version_archives/Chrome-${VER}.7z"
      if test -f "$ARCHIVE"; then
        EXE=$WORKING_DIR/${VER}/${EXE_NAME}
        wp wo_w "$WORKING_DIR"
        7z x -bd -o"$wo_w" -- "$ARCHIVE"
      fi
    fi
  fi
fi
VC_ROOT=$(/usr/bin/realpath "${VC_ROOT}")
VC_EXT=${VC_ROOT}/dist
if test -z "$DIST" && test -f "${VC_EXT}"/manifest.json && test -f "${VC_EXT}"/_locales/zh_CN/messages.json; then
  DIST=1
fi
if test ${DIST:-0} -gt 0; then
  VC_EXT=$(/usr/bin/realpath "${VC_EXT}")
  wp vc_ext_w "$VC_EXT"
  if ! test -f ${VC_EXT}/manifest.json; then
    echo -e "No dist extension: "$vc_ext_w >&2
    exit 1
  fi
else
  VC_EXT="$VC_ROOT"
  wp vc_ext_w "$VC_EXT"
fi
if test $UBO -le 0; then UBO=
elif test "$VER" == wo -o "$VER" == prev -o ${VER:-99} -ge 45; then
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
if test -n "$VER"; then
  rm -f -v "${EXE%/*}/default_apps/"* "${EXE%/*}/"[0-9]*"/default_apps/"* "${EXE%/*}/"[0-9]*"/Installer/"*
  rm -f -v "${EXE%/*}/"[0-9]*"/Locales/"[a-df-y]* "${EXE%/*}/"[0-9]*"/Locales/"e[a-mo-z]* >/dev/null
fi

if test -n "$PAGE_FLAGS"; then
  FLAGS=$FLAGS" --flag-switches-begin --enable-features="${PAGE_FLAGS#,}" --flag-switches-end"
fi

if test -n "$NO_EXT"; then
  vc_ext_w=
  OTHER_EXT=
fi

test -d "$WORKING_DIR" && cd "$WORKING_DIR" 2>/dev/null || cd "${EXE%/*}"

if test $USE_INSTALLED -ge 3; then
  echo -E Run: installed "${exe_w}" with "${vc_ext_w}"
  exec $RUN "$EXE" \
    --load-extension=${vc_ext_w}${OTHER_EXT} \
    --homepage ${HOME_PAGE:-chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/pages/options.html} \
    $OTHER_ARGS \
    --start-maximized $FLAGS "$@"
  exit 0
fi

test -d "$UD" || mkdir -p "$UD" || exit $?

# Refer: https://peter.sh/experiments/chromium-command-line-switches/
echo -E Run: "${exe_w}" at ${ud_w} with "${vc_ext_w}"
$RUN "$EXE" \
  --user-data-dir="${ud_w}" \
  --no-first-run --disable-default-apps\
   --disable-sync --no-default-browser-check \
  --load-extension="${vc_ext_w}${OTHER_EXT}" \
  --homepage ${HOME_PAGE:-chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/pages/options.html} \
  --disable-office-editing-component-extension \
  --disable-extensions-file-access-check \
  --disable-component-update \
  $OTHER_ARGS \
  --start-maximized $FLAGS "$@"
