#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "resto" > "$DIR/edition.txt"
exec "$DIR/run-desktop-linux.sh" -e resto "$@"
