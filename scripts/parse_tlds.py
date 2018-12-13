#!/usr/bin/env python3
FILE = "public_suffix_list.dat"
URL = "https://publicsuffix.org/list/" + FILE
DISABLED_TLDS = (
    "exe", "pdf", "zip",
)

import sys
from imp import reload
reload(sys)
if hasattr(sys, "setdefaultencoding"):
    sys.setdefaultencoding('utf-8')
else:
    import codecs
    sys.stdout = codecs.getwriter('utf8')(sys.stdout.detach())

import os, os.path as osp, re

FILE = list(filter(osp.exists, (
    FILE,
    osp.join("scripts", FILE),
    FILE + ".txt",
    osp.join("scripts", FILE + ".txt"),
)))
FILE = FILE and FILE[0]
if FILE:
    fp = open(FILE, "rb")
else:
    import urllib.request
    fp = urllib.request.urlopen(URL)
with fp:
    lines = [line.strip().decode("utf-8") for line in fp]
    lines = list(line
        for line in lines
        if line
            and line[0] != "#"
            and line[0:2] != "//"
    )

tlds = set(suffix.split(".")[-1] for suffix in lines)
tlds -= set(DISABLED_TLDS)

tlds = list(("%02d%s" % (len(i), i), i) for i in tlds)
tlds.sort(key=lambda i: i[0])
tlds = list(i[1] for i in tlds)

prefix, tail = '  , "', ' // char[%d][%d]'
format = '%s%s"%s'
for isEn in (True, False):
    print('Utils.%s = [""' % ('_tlds' if isEn else '_nonENTlds'))
    i, count, len_tld, line, len_line = "", 0, 2, "", len(prefix)
    for i in tlds:
        if (re.match(r'^[0-9A-Za-z]+\Z', i) is not None) != isEn:
            continue
        leni = len(i)
        if leni > len_tld:
            print(format % (prefix, line, tail % (count, len_tld) if count else ""))
            line = ''
            while len_tld + 2 < leni:
                len_tld += 1
                line += '", "'
            if line:
                print(format % (prefix, line, ""))
            count, len_tld, line, len_line = 0, leni, "", len(prefix)
        len_line += leni + 1
        if len_line > (120 if isEn else 80):
            line += "\\\n." + i
            len_line = leni + 1
        else:
            line += '.' + i
        count += 1
    if count > 0:
        print(format % (prefix, line, tail % (count, len_tld) if count else ""))
        count = 0
    print("];")
    if isEn:
        print("")

#from IPython import embed; embed()
