#!/usr/bin/env bash
set +o noglob
function bool() {
  [ "$1" = TRUE -o "$1" = true ] || (
    [ "$1" != FALSE -a "$1" != false ] && [ "${1:-0}" -gt 0 ]
  )
}

input=
[ -n "$ZIP_BASE" -a "${ZIP_BASE%/}" = "$ZIP_BASE" ] && ZIP_BASE=$ZIP_BASE/
if bool "$IN_DIST" && [ -d "dist" -a -f "dist/manifest.json" ]; then
  ZIP_BASE=dist/
elif [ -n "$ZIP_INPUT" ]; then
  input=$ZIP_INPUT
fi
if [ -n "$input" ]; then :
elif [ -n "$ZIP_BASE" ] && pushd $ZIP_BASE >/dev/null 2>&1 ; then
  input=$(echo *)
  popd >/dev/null 2>&1
else
  input=$(echo *)
fi
set -o noglob

ver=$(grep -m1 -o '"version":\s*"[0-9\.]*"' ${ZIP_BASE}manifest.json | awk -F '"' '{print $4;}')
output=$1
ori_output=$output
if [ -z "$output" -o -d "$output" ]; then
  output=${output%/}
  [ -z "${output#.}" ] && output=
  pkg_name=$ZIP_BASE
  if [ "$ZIP_BASE" = dist/ -a -z "$output" ]; then
    pkg_name=
    test -z "$ori_output" && ver=${ver}_dist
  elif [ -n "$output" ]; then
    output=${output}/
  elif [ -d '/wo' ]; then
    output=/wo/
  fi
  pkg_name=$(basename "${pkg_name:-$PWD}")
  pkg_name=${pkg_name//++/-plus}
  pkg_name=${pkg_name//+/-}
  pkg_name=${pkg_name%-}
  pkg_name=${pkg_name%_}
  output=$output${pkg_name:-vimium-plus}${ver:+_$ver}.zip
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
if ! bool "$NOT_IGNORE_FRONT"; then
  ZIP_IGNORE=$ZIP_IGNORE' front/manifest* front/*.png'
fi
zip -rX -MM $args "$output_for_zip" $input -x 'weidu*' 'test*' 'git*' \
  'dist*' 'front/vimium.css' 'node_modules*' 'script*' '*tsconfig*' 'type*' \
  'pages/chrome_ui*' 'Gulp*' 'gulp*' 'package*' 'todo*' 'tsc.*' \
  '*.coffee' '*.crx' '*.sh' '*.ts' '*.zip' $ZIP_IGNORE $4
err=$?
[ $pushd_err -eq 0 ] && popd >/dev/null 2>&1

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
echo ""
echo "$action_name $output"

key="$2"
if [ -z "$key" ]; then
  echo "No crx key info. Exit"
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
