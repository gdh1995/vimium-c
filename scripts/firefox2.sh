#!/usr/bin/env bash

VER=
FLAGS=
OTHER_EXT=
OTHER_ARGS=
USE_INSTALLED=0
FUD=
DO_CLEAN=0
WORKING_DIR=${WORKING_DIR:-/r/working}
VC_ROOT=
DIST=
AUTO_RELOAD=0
ALSO_VC=0
HOME_PAGE=
default_vc_root=/e/Git/weidu+vim/vimium-c
default_firefox_root="/d/Program Files/Firefox"
debugger_url="about:debugging#/runtime/this-firefox"
export WSLENV=PATH/l
unset "${!WEB_EXT@}"

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
  vc|--vc)
    ALSO_VC=1
    shift
    ;;
  only|--only)
    if test $DO_CLEAN -eq 1; then DO_CLEAN=2; fi
    shift
    ;;
  [3-9][0-9]|[1-9][0-9][0-9]|[3-9][0-9]esr|[1-9][0-9][0-9]esr|cur|wo|prev) # ver
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
  localhost)
    HOME_PAGE=$HOME_PAGE" --start-url http://$1/"
    shift
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

test $USE_INSTALLED -le 0 && FUD=${FUD:-/r/TEMP/FUD} || FUD=${FUD:-${default_firefox_root}/FUD}
if test $DO_CLEAN -gt 0 -a -e "$FUD"; then
  if test $USE_INSTALLED -gt 0; then
    echo -E "MUST NOT clean the default Profile folder"
    exit 1
  fi
  rm -rf "$FUD" || exit $?
  wp fud_w "$FUD"
  echo -E "Clean ${fud_w} : done."
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
fi

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

dir=$(/usr/bin/realpath "${BASH_SOURCE[0]}")
dir=${dir%/*}
if test -f "$dir"/core/firefox.exe; then
  FIREFOX_ROOT=$dir
  VC_ROOT=${VC_ROOT:-$default_vc_root}
else
  FIREFOX_ROOT=${FIREFOX_ROOT:-$default_firefox_root}
  VC_ROOT=${VC_ROOT:-${dir%/*}}
fi
if test -z "$VER" -a $USE_INSTALLED -le 0 && test -f "$WORKING_DIR"/core/firefox.exe; then
  VER=wo
fi
if test -z "$VER" -a $USE_INSTALLED -le 0; then
  VER_MIN=63
  for ((i=99;i>=VER_MIN;i--)); do
    if test -f "$WORKING_DIR/core$i/firefox.exe"; then
      VER=$i; break
    fi
  done
fi
test "$VER" == cur && VER=
if test "$VER" == wo || test -z "$VER" -a $USE_INSTALLED -le 0; then
  EXE=$WORKING_DIR/core/firefox.exe
else
  EXE=$WORKING_DIR/core${VER}/firefox.exe
  test -f "$EXE" || EXE=$FIREFOX_ROOT/core${VER}/firefox.exe
  if test $USE_INSTALLED -gt 0 || ! test -f "$EXE"; then
    EXE=$FIREFOX_ROOT/${VER:-core}/firefox.exe
    if test ! -f "$EXE" -a -n "$VER" \
        && find "$FIREFOX_ROOT/core/" -name "${VER}.*" 2>/dev/null | grep . >/dev/null 2>&1; then
      EXE=$FIREFOX_ROOT/core/firefox.exe
    fi
  elif test "${VER%esr}" -le 68; then
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
  rm -rf "${VC_EXT}"/_locales/*_*
  wp vc_ext_w "$VC_EXT"
  if ! test -f ${VC_EXT}/manifest.json; then
    echo -e "No dist extension: "$vc_ext_w >&2
    exit 1
  fi
else
  VC_EXT="$VC_ROOT"
  wp vc_ext_w "$VC_EXT"
fi
if test $USE_INSTALLED -gt 0 && ! grep '"id": "vimium-c@gdh1995.cn"' "${VC_EXT}/manifest.json" >/dev/null 2>&1; then
  echo "Error: MUST use a version of Vimium C only built for Firefox when use_installed is true" >&2
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


dir=${FUD}; dir=${dir#/}; fud_w=${dir%%/*}; dir=${dir#[a-z]}
fud_w=${fud_w^}:${dir}

test -d "$FUD" || mkdir -p "$FUD" || exit $?
test -d "$WORKING_DIR" && cd "$WORKING_DIR" 2>/dev/null || cd "${EXE%/*}"

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
echo -E web-ext run: "${exe_w}" at ${fud_w} with "${vc_ext_w}"
"$NODE" $WEB_EXT run \
  --firefox "$EXE" \
  --firefox-profile "$FUD" \
  --source-dir "$VC_EXT" \
  --keep-profile-changes \
  $OTHER_ARGS \
  --start-url $debugger_url $HOME_PAGE $FLAGS "$@"
