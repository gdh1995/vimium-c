#!/usr/bin/env bash
set +o noglob
function bool() {
  [ "$1" == TRUE -o "$1" == true ] || (
    [ "$1" != FALSE -a "$1" != false ] && [ "${1:-0}" -gt 0 ]
  )
}

in_dist=false
if bool "$IN_DIST" && [ -d "dist" -a -f "dist/manifest.json" ]; then
  in_dist=true
  cd dist; input=$(echo *); cd ..
elif [ -n "$ZIP_INPUT" ]; then
  input=$ZIP_INPUT
else
  input=$(echo *)
fi
set -o noglob

output=$1
if [ -z "$output" -o -d "$output" ]; then
  output=${output%/}
  if [ -n "$output" ]; then
    output=${output}/
  elif [ $in_dist == true ]; then
    output=dist/
  elif [ -d '/wo' ]; then
    output=/wo/
  fi
  ver=$(grep -m1 -o '"version":\s*"[0-9\.]*"' manifest.json | awk -F '"' '{print "_"$4}')
  pkg_name=$(basename "$PWD")
  pkg_name=${pkg_name//++/-plus}
  pkg_name=${pkg_name//+/-}
  pkg_name=${pkg_name%-}
  pkg_name=${pkg_name%_}
  output=$output${pkg_name:-vimium-plus}$ver.zip
elif [ "${output/./}" == "$output" ]; then
  output=$output.zip
  echo "the zip file will be \"$output\""
fi

args=$5
if [ -z "$args" -a "$output" != "-" -a -f "$output" ]; then
  args="-FS"
fi
args="$ZIP_FLAGS $args"

output_for_zip=${output}
if [ $in_dist == true ]; then
  cd dist
  if [ "${output_for_zip#/}" == "${output_for_zip#[a-zA-Z]:/}" ]; then
    output_for_zip=../${output_for_zip}
  fi
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
  'dist*' 'front/vimium.css' 'node_modules*' '*tsconfig*' 'types*' \
  'pages/chrome_ui*' 'Gulp*' 'gulp*' 'package*' 'todo*' 'tsc.*' \
  '*.coffee' '*.crx' '*.sh' '*.ts' '*.zip' $ZIP_IGNORE $4
err=$?
[ $in_dist == true ] && cd ..

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
echo "Wrote $output"

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
