#!/usr/bin/env bash

VER=
FLAGS=
OTHER_EXT=
OTHER_ARGS=
FUD=${FUD:-/r/TEMP/FUD}
WORKING_DIR=${WORKING_DIR:-/r/working}
VC_ROOT=
DIST=
AUTO_RELOAD=0
HOME_PAGE=
default_vc_root=/e/Git/weidu+vim/vimium-c
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
    if test -e "$FUD"; then
      rm -rf "$FUD" || exit $?
      wp fud_w "$FUD"
      echo -E "Clean ${fud_w} : done."
    fi
    shift
    ;;
  noreload|--noreload|--no-reload|no-reload)
    AUTO_RELOAD=0
    shift
    ;;
  reload|--reload)
    AUTO_RELOAD=1
    shift
    ;;
  test|--test) # no the "Disable developer mode extensions" dialog, but add an extra infobar
    FLAGS=$FLAGS" --pref browser.aboutConfig.showWarning=false"
    shift
    ;;
  zh|cn|zh-cn|zh-CN|--zh|--cn|--zh-cn|--zh-CN)
    FLAGS=$FLAGS" --pref general.useragent.locale=zh-CN"
    shift
    ;;
  en|en-us|en-US|--en|--en-us|--en-US)
    FLAGS=$FLAGS" --pref general.useragent.locale=en-US"
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
  [3-9][0-9]|cur|wo|prev|[1-9a-f][1-9a-f][1-9a-f][1-9a-f][1-9a-f][1-9a-f]*) # ver
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
  FIREFOX_ROOT='/r/working'
  VC_ROOT=${VC_ROOT:-${dir%/*}}
fi
if test -z "$VER" && test -f "$WORKING_DIR"/core/firefox.exe; then
  VER=wo
fi
if test -z "$VER"; then
  VER_MIN=63
  for ((i=99;i>=VER_MIN;i--)); do
    if test -f "$WORKING_DIR/core$i/firefox.exe"; then
      VER=$i; break
    fi
  done
fi
test "$VER" == cur && VER=
if test "$VER" == wo -o -z "$VER"; then
  EXE=$WORKING_DIR/core/firefox.exe
else
  EXE=$WORKING_DIR/core${VER}/firefox.exe
  test -f "$EXE" || EXE=$FIREFOX_ROOT/core${VER}/chrome.exe
  if test $VER -le 68; then
    debugger_url="about:debugging#addons"
  fi
fi
VC_ROOT=$(/usr/bin/realpath "${VC_ROOT}")
VC_EXT=${VC_ROOT}/dist
if test -z "$DIST" && test -d "${VC_EXT}"/_locales && ! test -f "${VC_EXT}"/_locales/zh_CN/messages.json; then
  DIST=1
fi
if test ${DIST:-0} -gt 0; then
  VC_EXT=$(/usr/bin/realpath "${VC_EXT}")
  rm -rf "${VC_EXT}"/_locales/*_*
  wp vc_ext_w "$VC_EXT"
  if ! test -f ${VC_EXT}/manifest.json; then
    echo -e "No dist extension: "$vc_ext_w >&2
  fi
else
  VC_EXT="$VC_ROOT"
  wp vc_ext_w "$VC_EXT"
fi

exe_w=$($REALPATH -m "$EXE")
if ! test -f "$EXE"; then
  echo -E "No such a file: "$exe_w >&2
  exit 1
fi
if test -n "$VER" -o "$FIREFOX_ROOT" == '/r/working'; then
  rm -f "${EXE%/*}"/uninstall/* "${EXE%/*}"/update[-r]*
fi


dir=${FUD}; dir=${dir#/}; fud_w=${dir%%/*}; dir=${dir#[a-z]}
fud_w=${fud_w^}:${dir}

test -d "$FUD" || mkdir -p "$FUD" || exit $?
test -d "$WORKING_DIR" && cd "$WORKING_DIR" 2>/dev/null || cd "${EXE%/*}"

WEB_EXT=node_modules/web-ext/bin/web-ext
if test -f "$VC_ROOT/$WEB_EXT"; then
  WEB_EXT=$VC_ROOT/$WEB_EXT
else
  WEB_EXT=$default_vc_root/$WEB_EXT
fi

if test $AUTO_RELOAD -le 0; then
  FLAGS=$FLAGS" --no-reload"
fi

# Refer: https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/
echo -E web-ext run: "${exe_w}" at ${fud_w} with "${vc_ext_w}"
$NODE $WEB_EXT run \
  --firefox "$EXE" \
  --firefox-profile "$FUD" \
  --source-dir "$VC_EXT" \
  --keep-profile-changes \
  $OTHER_ARGS \
  --start-url $debugger_url $HOME_PAGE $FLAGS "$@"
