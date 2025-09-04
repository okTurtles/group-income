#!/bin/sh

# exit on error
set -e
# echo commands
set -x

VERSION=$(grep '"version"' package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')

grunt clean
grunt deploy
# prevent ._ files from being included in the archive on macOS
find dist -not -name '._*' | cpio -H ustar -o | gzip -9 > gi-v${VERSION}.debug.tgz

grunt clean
NODE_ENV=production grunt deploy
find dist -not -name '._*' | cpio -H ustar -o | gzip -9 > gi-v${VERSION}.tgz

sha256sum gi-*
