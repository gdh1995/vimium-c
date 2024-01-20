#!/usr/bin/env bash

VER=
FLAGS=
OTHER_EXT=
OTHER_ARGS=
USE_INSTALLED=0
UD=${TEST_USER_DATA}
DO_CLEAN=0
WORKING_DIR=${WORKING_DIR:-/r/working}
VC_ROOT=
DIST=
AUTO_RELOAD=0
ALSO_VC=0
HOME_PAGE=
EXE_NAME=${EXE_NAME:-firefox.exe}
default_vc_root=/e/Git/weidu+vim/vimium-c
default_firefox_root="/d/Program Files/Firefox"
version_archives=/f/Application/Browser/firefox
debugger_url="about:debugging#/runtime/this-firefox"
export WSLENV=PATH/l
unset "${!WEB_EXT@}"

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
  noreload|--noreload|--no-reload|no-reload)
    AUTO_RELOAD=0
    shift
    ;;
  reload|--reload|auto-reload|--auto-reload)
    AUTO_RELOAD=1
    shift
    ;;
  test|--test) # no the "Disable developer mode extensions" dialog, but add an extra infobar
    FLAGS=$FLAGS" --pref=browser.aboutConfig.showWarning=false"
    shift
    ;;
  zh|cn|zh-cn|zh-CN|--zh|--cn|--zh-cn|--zh-CN)
    FLAGS=$FLAGS" --pref=general.useragent.locale=zh-CN"
    shift
    ;;
  en|en-us|en-US|--en|--en-us|--en-US)
    FLAGS=$FLAGS" --pref=general.useragent.locale=en-US"
    shift
    ;;
  fr|fr-fr|fr-FR|--fr|--fr-fr|--fr-FR)
    FLAGS=$FLAGS" --pref=general.useragent.locale=fr-FR"
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
  only|--only)
    if test $DO_CLEAN -eq 1; then DO_CLEAN=2; fi
    shift
    ;;
  [3-9]+([0-9.])|[1-9][0-9]+([0-9.ab])|[3-9]+([0-9.])esr|[1-9][0-9]+([0-9.])esr|cur|wo|prev) # ver
    VER=$1
    shift
    ;;
  -*)
    OTHER_ARGS=$OTHER_ARGS" $1"
    shift
    ;;
  *://*|about:*)
    HOME_PAGE=$HOME_PAGE" --start-url $1"
    shift
    ;;
  localhost*|*.localhost*)
    HOME_PAGE=$HOME_PAGE" --start-url http://$1"
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
  NODE=
else
  ENV=$(which env.exe)
  RUN=$ENV' start2.exe'
  REALPATH=/bin/wslpath
  NODE=${ENV%/*}/bash.exe' -i node'
fi

test $USE_INSTALLED -le 1 && UD=${UD:-/tmp/FUD} || UD=${UD:-${default_firefox_root}/FUD}
wp ud_w "$UD"
if test $DO_CLEAN -gt 0 -a -e "$UD"; then
  if test $USE_INSTALLED -ge 2; then
    echo -E "MUST NOT clean the default Profile folder"
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
if test -f "$dir"/core/${EXE_NAME}; then
  FIREFOX_ROOT=$dir
  VC_ROOT=${VC_ROOT:-$default_vc_root}
else
  FIREFOX_ROOT=${FIREFOX_ROOT:-$default_firefox_root}
  VC_ROOT=${VC_ROOT:-${dir%/*}}
fi
if test -n "$VER" -o $USE_INSTALLED -ge 1; then :
elif test -f "$WORKING_DIR"/core/${EXE_NAME}; then VER=wo
else
  VER_MIN=63
  VER=$(ls -dvr "$WORKING_DIR"/core[1-9]*/ 2>/dev/null | head -n 1)
  VER=${VER#"$WORKING_DIR/core"}; VER=${VER%/}
  VER_NUM=${VER%%[!0-9]*}
  if test "${VER_NUM:-63}" -lt 63 ; then
    echo "Error: require Firefox 63+ but found $VER only"
    exit 1
  fi
fi
test "$VER" == cur && VER=
if test "$VER" == wo || test -z "$VER" -a $USE_INSTALLED -le 0 && test -f "$WORKING_DIR/core/${EXE_NAME}"; then
  EXE=$WORKING_DIR/core/${EXE_NAME}
else
  if test $USE_INSTALLED -le 0; then
    EXE=$WORKING_DIR/core${VER}/${EXE_NAME}
    if ! test -f "$EXE" && test -n "$VER"; then
      EXE=$WORKING_DIR/core${VER}esr/${EXE_NAME}
      test -f "$EXE" || EXE=$FIREFOX_ROOT/core${VER}/${EXE_NAME}
      test -f "$EXE" || EXE=$FIREFOX_ROOT/core${VER}esr/v
      if ! test -f "$EXE" -o -e "$WORKING_DIR/core${VER}"; then
        ARCHIVE="$version_archives/Firefox-${VER}esr.7z"
        test -f "$ARCHIVE" || ARCHIVE="$version_archives/Firefox-${VER}.7z"
        if test -f "$ARCHIVE"; then
          EXE=$WORKING_DIR/core${VER}esr/${EXE_NAME}
          test "${ARCHIVE%esr.7z}" != "$ARCHIVE" || EXE=$WORKING_DIR/core${VER}/${EXE_NAME}
          wp wo_w "$WORKING_DIR"
          7z x -bd -o"$wo_w" -- "$ARCHIVE"
        fi
      fi
    fi
  fi
  test -f "$EXE" || EXE=$FIREFOX_ROOT/core${VER}/${EXE_NAME}
  if test $USE_INSTALLED -ge 1 || ! test -f "$EXE"; then
    EXE=$FIREFOX_ROOT/${VER:-core}/${EXE_NAME}
    if test ! -f "$EXE" -a -n "$VER" \
        && find "$FIREFOX_ROOT/core/" -name "${VER}.*" 2>/dev/null | grep . >/dev/null 2>&1; then
      EXE=$FIREFOX_ROOT/core/${EXE_NAME}
    fi
  elif test -n "$VER" && test "${VER%%@(esr|.|a|b)*}" -le 68; then
    debugger_url="about:debugging#addons"
  fi
fi
VC_ROOT=$(/usr/bin/realpath "${VC_ROOT}")
VC_EXT=${VC_ROOT}/dist
if test -z "$DIST" && test -f "${VC_EXT}"/manifest.json && ! test -f "${VC_EXT}"/_locales/zh_CN/messages.json; then
  DIST=1
fi
if test ${DIST:-0} -gt 0; then
  VC_EXT=$(/usr/bin/realpath "${VC_EXT}")
  rm -rf "${VC_EXT}"/_locales/zh_CN
  wp vc_ext_w "$VC_EXT"
  if ! test -f ${VC_EXT}/manifest.json; then
    echo -e "No dist extension: "$vc_ext_w >&2
    exit 1
  fi
else
  VC_EXT="$VC_ROOT"
  wp vc_ext_w "$VC_EXT"
fi
if test $USE_INSTALLED -ge 2 && ! grep '"id": "vimium-c' "${VC_EXT}/manifest.json" >/dev/null 2>&1 \
    && grep 'Vimium C' "${VC_EXT}/manifest.json" >/dev/null 2>&1; then
  echo "Error: MUST use a version of Vimium C built for Firefox when use_installed >= 2" >&2
  exit 1
fi

exe_w=$($REALPATH -m "$EXE")
if ! test -f "$EXE"; then
  echo -E "No such a file: "$exe_w >&2
  exit 1
fi
if test -n "$VER" -o "$FIREFOX_ROOT" == '/r/working'; then
  rm -f "${EXE%/*}"/uninstall/* "${EXE%/*}"/update[-r]*
  rm -r "${EXE%/*}"/uninstall 2>/dev/null
fi

test -d "$WORKING_DIR" && cd "$WORKING_DIR" 2>/dev/null || cd "${EXE%/*}"

if test $USE_INSTALLED -ge 3; then
  echo -E start: "${exe_w}" "(installed)"
  exec "$EXE" -foreground -no-remote -profile "$UD" \
    --url about:home \
    ${HOME_PAGE//start-/} "$@"
fi

test -d "$UD" || mkdir -p "$UD" || exit $?

WEB_EXT=node_modules/web-ext/bin/web-ext
if test -f "$VC_ROOT/$WEB_EXT"; then
  WEB_EXT=$VC_ROOT/$WEB_EXT
elif test -f "$default_vc_root/$WEB_EXT"; then
  WEB_EXT=$default_vc_root/$WEB_EXT
else
  WEB_EXT=web-ext
  NODE=$(which node.exe 2>/dev/null)
  if test -n "$NODE"; then
    NODE=$(dirname "$NODE")/npx
  else
    NODE=npx
  fi
fi

if test $AUTO_RELOAD -le 0; then
  FLAGS=$FLAGS" --no-reload"
fi

# Refer: https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/
echo -E web-ext run: "${exe_w}" at ${ud_w} with "${vc_ext_w}"
"$NODE" $WEB_EXT run \
  --firefox "$EXE" \
  --firefox-profile "$UD" \
  --source-dir "$VC_EXT" \
  --keep-profile-changes \
  $OTHER_ARGS \
  --start-url $debugger_url $HOME_PAGE $FLAGS "$@"
