#!/bin/sh

# exit on error
set -e
# echo commands
set -x

VERSION=$(grep '"version"' package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
TAR_FLAGS="--no-acls"

# prevent ._ files from being included in the archive on macOS
[ "$(uname -s)" = "Darwin" ] && TAR_FLAGS="--no-mac-metadata --no-acls"

grunt clean
grunt deploy
tar -czv $TAR_FLAGS -f gi-v${VERSION}.debug.tgz dist

grunt clean
NODE_ENV=production grunt deploy
tar -czv $TAR_FLAGS -f gi-v${VERSION}.tgz dist

sha256sum gi-*
