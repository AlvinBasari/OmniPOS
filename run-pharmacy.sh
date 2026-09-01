#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "pharmacy" > "$DIR/edition.txt"
exec "$DIR/run-desktop-linux.sh" -e pharmacy "$@"
