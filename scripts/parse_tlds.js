#!/usr/bin/env node
"use strict"

//@ts-check
const fs = require("fs")
const pathModule = require("path")

const FILE = "public_suffix_list.dat"
const URL = "https://publicsuffix.org/list/" + FILE
const DISABLED_TLDS = [
        "exe", "pdf", "zip",
].filter(i => i)

let curFile = [
    FILE,
    pathModule.join("scripts", FILE),
    FILE + ".txt",
    pathModule.join("scripts", FILE + ".txt"),
].filter(i => i && fs.existsSync(i))[0] || ""

/** @type { string } */
const lines = fs.existsSync(curFile)
        ? fs.readFileSync(curFile, {encoding: "utf-8"})
        : await new Promise((resolve, reject) => {
    let body = ""
    const req = (URL[4] === "s" ? require("https") : require("http")).get(URL, res => {
        res.setEncoding("utf-8")
                .on("data", chunk => body += chunk)
                .on("end", () => {
            if (res.statusCode == 200) {
                resolve(body)
            } else {
                req.off("error", reject).on("abort", () => {}).abort()
                reject(`HTTP ${res.statusCode}: ${body}`)
            }
        })
    })
    req.on("error", reject)
})
const tlds = [... new Set(lines.split(/\r\n?|\n/)
            .filter(line => line && line[0] !== "#" && line.slice(0, 2) !== "//")
            .map(line => line.split(".").slice(-1)[0])
        )]
        .filter(i => ! DISABLED_TLDS.includes(i))
        .map(i => `${i.length < 10 ? "0" : ""}${i.length}${i}`)
        .sort()
        .map(i => i.slice(2))

const prefix = '  , "'
for (const isEn of [true, false]) {
    print(`BgUtils_.${isEn ? "_tlds" : "_nonENTlds"} = [""`)
    let [count, len_tld, line, len_line] = [0, 2, "", prefix.length]
    for (const i of tlds) {
        if (/^[\dA-Za-z]+$/.test(i) != isEn) { continue }
        const leni = i.length
        if (leni > len_tld) {
            print(`${prefix}${line}"${count ? ` // char[${count}][${len_tld}]` : ""}`)
            line = ""
            while (len_tld + 2 < leni) {
                len_tld += 1
                line += '", "'
            }
            if (line) {
                print(`${prefix}${line}`)
            }
            [count, len_tld, line, len_line] = [0, leni, "", prefix.length]
        }
        len_line += leni + 1
        if (len_line > (isEn ? 120 : 80)) {
            line += "\\\n." + i
            len_line = leni + 1
        } else {
            line += '.' + i
        }
        count += 1
    }
    if (count > 0) {
        print(`${prefix}${line}${count ? ` // char[${count}][${len_tld}]` : ""}`)
        count = 0
    }
    print("];")
    if (isEn) {
        print("")
    }
}

function print() {
    console.log(...arguments)
}