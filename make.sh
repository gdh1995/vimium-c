#!/usr/bin/env bash
set +o noglob
input=$(echo *)
set -o noglob

output=$1
if [ -z "$output" -o -d "$output" ]; then
  output=${output%/}/
  ver=$(grep -m1 '"version"' manifest.json | awk -F '"' '{print "_"$4}')
  pkg_name=$(basename "$PWD")
  pkg_name=${pkg_name//++/_plus}
  pkg_name=${pkg_name//+/_}
  pkg_name=${pkg_name%_}
  output=$output${pkg_name:-vimium_plus}$ver.zip
elif [ "${output/./}" == "$output" ]; then
  output=$output.zip
  echo "the zip file will be \"$output\""
fi

args=$5
if [ -z "$args" -a "$output" != "-" -a -f "$output" ]; then
  args="-FS"
fi

zip -roX -MM $args "$output" $input -x '.*' '*.sh' 'weidu*' 'test*' 'git*' \
  '*/.*' '*.coffee' '*.crx' '*.ts' '*.zip' $4
err=$?
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
