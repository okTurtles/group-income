#!/bin/sh

# exist on error
set -e
VERSION=$(grep '"version"' package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')

# echo commands
set -x

grunt clean
grunt deploy
# prevent ._ files from being included in the archive on macOS
tar -czv --no-mac-metadata --no-acls -f gi-v${VERSION}.debug.tgz dist

grunt clean
NODE_ENV=production grunt deploy
tar -czv --no-mac-metadata --no-acls -f gi-v${VERSION}.tgz dist

sha256sum gi-*
