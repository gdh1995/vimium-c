#!/usr/bin/env bash
set +o noglob
input=$(echo *)
set -o noglob

exclude_dir="! -path dist* ! -path test* ! -path weidu*"

input=$(find $input $exclude_dir \
    ! -name todo* ! -name tsconfig* ! -name *~ \
    ! -name *.crx ! -name *.js ! -name .*.json ! -name *.ts ! -name *.sh \
    ! -name *.zip)
input2=$(find $input -name *.min.js $exclude_dir)

out_dir=dist
[ -d "$out_dir" ] || mkdir -p "$out_dir"

for i in $input $input2; do
  y=$out_dir/$i
  if [ -f "$i" ]; then
    if [ "$i" -nt "$y" ]; then
      cp -p "$i" "$out_dir/$i"
      echo "copy: $i"
    fi
  elif [ ! -e "$out_dir/$i" ]; then
    mkdir -p "$out_dir/$i"
    echo "create folder: $i"
  fi
done

echo "All copied to $out_dir/"
