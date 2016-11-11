#!/bin/sh
set -o noglob

output="$1"
if [ -n "$output" -a ! -d "$output" ]; then :
else
  if [ -n "$output" -a -d "$output" ]; then
    output="${output/%\//}/"
  fi
  ver=`grep '"version"' manifest.json | awk -F '"' '{print $4}'`
  output="${output}"vimium_plus_$ver.zip
fi

args=""
if [ "$output" != "-" -a -f "$output" ]; then
  args="-u"
fi

zip -roX -MM $args "$output" . -x ".*" "*.sh" "weidu/*" "test*" \
  "*/.*" "*.coffee" "*.crx" "*.ts" "*.zip" $4
err=$?
if [ $err -ne 0 ] ; then
  echo "$0: exit because of an error during zipping" 1>&2
  exit $err
fi
echo ""
echo "Wrote $output"

key="$2"
if [ -z "$key" ]; then
  echo "No crx key info. Exit."
  exit
fi
if ! which xxd >/dev/null 2>&1 ; then
  echo 'No "xxd" program. Exit.' 1>&2
  exit 1
fi
crx="$3"
if [ -z "$crx" ]; then
  crx="${output/%.zip/}.crx"
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
