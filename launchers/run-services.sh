#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

export PATH=$HOME/.dotnet:$HOME/.nodejs/bin:$PATH
export LD_LIBRARY_PATH="$DIR/publish/linux-x64:$LD_LIBRARY_PATH"
export GDK_BACKEND=x11,wayland,*
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
export no_proxy="localhost,127.0.0.1,::1,$no_proxy"
export NO_PROXY="localhost,127.0.0.1,::1,$NO_PROXY"

rm -rf ~/.cache/OmniPos.Desktop ~/.cache/webkitgtk 2>/dev/null || true

echo "=========================================================="
echo "  Meluncurkan OmniPOS Layanan, Barbershop & Laundry       "
echo "  Database Terisolasi: pos_services.db                   "
echo "=========================================================="

exec "$DIR/publish/linux-x64/OmniPos.Desktop" --edition=services "$@"
