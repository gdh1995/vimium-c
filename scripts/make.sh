#!/usr/bin/env bash
set +o noglob
function bool() {
  [ "$1" = TRUE -o "$1" = true ] || (
    [ "$1" != FALSE -a "$1" != false ] && [ "${1:-0}" -gt 0 ]
  )
}
function confirm() {
  echo -n -e "${1:-Are you sure} (y/[N])?\e[0m "
  local response; shift
  read -r "$@" -p "" response || echo
  case "$response" in
  [yY][eE][sS]|[yY]) return 0 ;;
  *) return 1 ;;
  esac
}

if [ "${PWD##*/}" = weidu ]; then
  ZIP_BASE=
  test -d ../vimium-c/ && script_base=../vimium-c/ || script_base=../
  INCLUDE_DOT_FILES=
  IN_DIST=
  WITH_MAP=
  ZIP_INPUT=
  ZIP_IGNORE='img/bg* img/tab*'
fi

input=
[ -z "$ZIP_BASE" -a -f "make.sh" ] && [ "${PWD##*/}" = scripts ] && ZIP_BASE=$(exec dirname "$PWD")
[ -n "$ZIP_BASE" -a "${ZIP_BASE%/}" = "$ZIP_BASE" ] && ZIP_BASE=$ZIP_BASE/
if bool "$IN_DIST" && [ -d "${ZIP_BASE}dist" -a -f "${ZIP_BASE}dist/manifest.json" ]; then
  ZIP_BASE=${ZIP_BASE}dist/
elif [ -n "$ZIP_INPUT" ]; then
  input=($ZIP_INPUT)
elif bool "$IN_DIST"; then
  echo "No generated extension in ./dist !" 1>&2
  exit 1
fi
has_mod=
if bool "$CI" || bool "$TRAVIS"; then
  which git >/dev/null 2>&1 && test -d .git && git status
elif bool "$IN_DIST" && test -d .git && which git >/dev/null 2>&1 && ! git diff-index --quiet HEAD --; then
  if ! confirm $'\n''\e[1;33mERROR: Some files have not been committed. Do continue'; then
    echo $'\n'Aborted.
    exit 0
  fi
  has_mod="-mod"
fi

if [ -n "$input" ]; then :
else
  NEED_POP=0
  [ -n "$ZIP_BASE" ] && pushd $ZIP_BASE >/dev/null 2>&1 && NEED_POP=1
  OLD_IFS="$IFS"
  IFS=$'\n'
  input=($(GLOBIGNORE=dist:node_modules:tests:weidu; echo *))
  IFS="$OLD_IFS"
  test $NEED_POP -eq 1 && popd >/dev/null 2>&1
fi
set -o noglob

ver=$(grep -m1 -o '"version":\s*"[0-9\.]*"' ${ZIP_BASE}manifest.json | awk -F '"' '{print $4;}')
manifest_version=$(grep -m1 -o '"manifest_version":\s*[0-9\.]*' ${ZIP_BASE}manifest.json | awk -F ':\\s*' '{print $2;}')
output=$1
ori_output=$output
test_working=${TEST_WORKING:-1}
# 0: may be; 1: is Chromium; 2: is Firefox
btypes=${BUILD_BTypes:-0}
test "$manifest_version" == "2" && mv2_tail="-mv2" || mv2_tail=
if [ -z "$output" -o -d "$output" ]; then
  output=${output%/}
  [ -z "${output#.}" ] && output=
  pkg_name=$ZIP_BASE
  if [ "$ZIP_BASE" = dist/ -a -z "$output" ]; then
    pkg_name=
    if [ -n "$ori_output" ]; then :
    elif bool "$WITH_MAP"; then
      ver=${ver}-debug
    elif test "$BUILD_EdgeC" == 1; then
      ver=${ver}-edge
      btypes=1
    elif test -f "$ZIP_BASE/.build/.chrome.build"; then
      ver=${ver}-chrome
      btypes=1
    elif test -f "$ZIP_BASE/.build/.firefox.build"; then
      ver=${ver}-firefox
      btypes=2
    else
      ver=${ver}-dist
    fi
    if test -f /cmd/git.exe; then
      exact_git=/cmd/git.exe
    elif test -f /usr/bin/git; then
      exact_git=/usr/bin/git
    else
      exact_git=git
    fi
    git_hash=$("$exact_git" rev-parse --short=7 HEAD 2>/dev/null)
    # echo "Use Git Hash: $git_hash"
    ver=${ver}${git_hash:+-${git_hash}}${mv2_tail}${has_mod}
    if bool "$test_working" && [ -d '/wo' ]; then
      output=/wo/
    fi
  elif [ -n "$output" ]; then
    output=${output}/
  elif bool "$test_working" && [ -d '/wo' ]; then
    output=/wo/
  fi
  pkg_name=$(basename "${pkg_name:-$PWD}")
  pkg_name=${pkg_name//++/_plus}
  pkg_name=${pkg_name//+/_}
  pkg_name=${pkg_name// /_}
  pkg_name=${pkg_name%-}
  pkg_name=${pkg_name%_}
  pkg_name=${pkg_name//-c/_c}
  output=$output${pkg_name:-vimium_c}${ver:+-$ver}.zip
elif [ "${output%.[a-z]*}" = "$output" ]; then
  output=$output.zip
fi
output=${output/\$VERSION/$ver}
if [ -n "$ori_output" -a "$output" != "$ori_output" ]; then
  echo "The zip file will be \"$output\""
fi
unset ver ori_output pkg_name

args=$5
action_name="Wrote"
if [ -z "$args" -a "$output" != "-" -a -f "$output" ]; then
  action_name="Updated"
  args="-FS"
fi
args="$ZIP_FLAGS $args"

output_for_zip=$output
pushd_err=0
if [ -n "$ZIP_BASE" ]; then
  if [ "${output_for_zip#/}" = "${output_for_zip#[a-zA-Z]:/}" ]; then
    output_for_zip=${PWD%/}/${output_for_zip}
  fi
  pushd "$ZIP_BASE" >/dev/null 2>&1
  pushd_err=$?
fi
if ! bool "$INCLUDE_DOT_FILES"; then
  ZIP_IGNORE=$ZIP_IGNORE' .* */.*'
fi
if ! bool "$WITH_MAP"; then
  ZIP_IGNORE=$ZIP_IGNORE' *.map'
fi
if test $btypes == 2; then
  ZIP_IGNORE=$ZIP_IGNORE' *.bin _locales/zh_CN/'
elif test $btypes == 1; then
  ZIP_IGNORE=$ZIP_IGNORE' icons/disable*.png icons/partial*.png'
fi
if ! bool "$INCLUDE_ALL_DOCS"; then
  ZIP_IGNORE=$ZIP_IGNORE' RELEASE*.md README-*.md README_*.md'
fi
zip -rX -MM $args "$output_for_zip" ${input[@]} -x 'weidu*' 'helpers*' 'test*' 'git*' \
  'dist*' 'node_modules*' 'script*' '*tsconfig*' 'type*' \
  'GUD*' 'Gulp*' 'gulp*' 'npm*' 'package*' 'todo*' 'tsc.*' \
  '*tslint*' '*.dll' '*.so' '*.lib' '*.exp' '*.a' '*.pdb' '*.py' \
  '[a-hj-z]*.bin' '*_*.bin' '*.mp3' '*.mp4' \
  '*.coffee' '*.crx' '*.enc' '*.log' '*.psd' '*.sh' '*.ts' '*.zip' $ZIP_IGNORE $4
err=$?
[ $pushd_err -eq 0 ] && popd >/dev/null 2>&1
set +x

if [ $err -ne 0 ]; then
  echo "$0: exit because of an error during zipping" 1>&2
  exit $err
fi
if [ -f "$output" ]; then :
elif [ -f "$output.zip" ]; then
  output=$output.zip
else
  echo "$0: exit because the zip file \"$output\" is not found" 1>&2
  exit 1
fi
echo "$action_name $output"

function print_reproduce() {
  if bool "$IN_DIST" && test -f "$ZIP_BASE/.snapshot.sh"; then
    echo -n $'\n'Source version:$'\n'''
    cat "$ZIP_BASE/.snapshot.sh" | head -n 2
    echo $'\n'Building steps in a Bash shell with Node.js 17+ and NPM:$'\n''```'
    cat "$ZIP_BASE/.snapshot.sh" | tail -n +2
    echo '```'$'\n'
  fi
}

if test -f "$ZIP_BASE/.build/.firefox.build"; then
  print_reproduce
  exit
fi

key="$2"
if [ -z "$key" ]; then
  echo $'\n'No crx key info.
  print_reproduce
  exit
fi
for i in openssl xxd; do
  if ! which $i >/dev/null 2>&1 ; then
    echo "No \"$i\" program. Exit" 1>&2
    exit 1
  fi
done
crx=$3
if [ -z "$crx" ]; then
  crx=${output%.zip}.crx
fi

openssl sha1 -sha1 -binary -sign "$key" < "$output" > "$crx.sig"
openssl rsa -pubout -outform DER < "$key" > "$crx.pub" 2>/dev/null

function byte_swap() {
  echo "${1:6:2}${1:4:2}${1:2:2}${1:0:2}"
}

crmagic_hex="4372 3234"  # Cr24
version_hex="0200 0000"  # 2
pub_len_hex=$(printf '%08x' $(\ls -l "$crx.pub" | awk '{print $5}'))
pub_len_hex=$(byte_swap $pub_len_hex)
sig_len_hex=$(printf '%08x' $(\ls -l "$crx.sig" | awk '{print $5}'))
sig_len_hex=$(byte_swap $sig_len_hex)

(
  echo "$crmagic_hex $version_hex $pub_len_hex $sig_len_hex" | xxd -r -p
  cat "$crx.pub" "$crx.sig" "$output"
) > "$crx"
echo "Wrote $crx"
rm -f "$crx.sig" "$crx.pub" 2>/dev/null

print_reproduce
