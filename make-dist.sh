#!/usr/bin/env bash
set +o noglob
input=$(echo *)
set -o noglob

exclude_dir="! -path weidu* ! -path test* ! -path git* ! -path dist* ! -path types*"
exclude_dir="$exclude_dir ! -path node_modules*"

input=$(find $input $exclude_dir \
    ! -name .* ! -name todo* ! -name tsconfig* ! -name vimium.css ! -name *~ \
    ! -name *.coffee ! -name *.crx ! -name *.js ! -name *.sh ! -name *.ts \
    ! -name *.zip)
input2=$(find $input -name *.min.js $exclude_dir)
input2="$input2 pages/newtab.js"

out_dir=dist
[ -d "$out_dir" ] || mkdir -p "$out_dir"

for i in $input $input2; do
  y=$out_dir/$i
  if [ -f "$i" ]; then
    if [ "$i" -nt "$y" ]; then
      cp -a "$i" "$out_dir/$i"
      echo "copy: $i"
    fi
  elif [ ! -e "$out_dir/$i" ]; then
    mkdir -p "$out_dir/$i"
    echo "mkdir: $i"
  fi
done

echo "All copied to $out_dir/"
