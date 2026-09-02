#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

export PATH=$HOME/.dotnet:$HOME/.nodejs/bin:$PATH
export LD_LIBRARY_PATH="$DIR/publish/linux-x64:$LD_LIBRARY_PATH"
export GDK_BACKEND=x11,wayland,*
# Ensure WebKitGTK compatibility symlinks exist for Photino
if [ ! -f "$DIR/publish/linux-x64/libwebkit2gtk-4.0.so.37" ]; then
    for path in /usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so.0 /usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.0.so.37 /usr/lib64/libwebkit2gtk-4.1.so.0; do
        if [ -f "$path" ]; then
            ln -sf "$path" "$DIR/publish/linux-x64/libwebkit2gtk-4.0.so.37" 2>/dev/null || true
            break
        fi
    done
fi
if [ ! -f "$DIR/publish/linux-x64/libjavascriptcoregtk-4.0.so.18" ]; then
    for path in /usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.1.so.0 /usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.0.so.18 /usr/lib64/libjavascriptcoregtk-4.1.so.0; do
        if [ -f "$path" ]; then
            ln -sf "$path" "$DIR/publish/linux-x64/libjavascriptcoregtk-4.0.so.18" 2>/dev/null || true
            break
        fi
    done
fi

export WEBKIT_FORCE_SANDBOX=0
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
export no_proxy="localhost,127.0.0.1,::1,$no_proxy"
export NO_PROXY="localhost,127.0.0.1,::1,$NO_PROXY"

rm -rf ~/.cache/OmniPos.Desktop ~/.cache/webkitgtk 2>/dev/null || true

echo "=========================================================="
echo "  Meluncurkan OmniPOS Gadget, Elektronik & IMEI           "
echo "  Database Terisolasi: pos_electronics.db                "
echo "=========================================================="

exec "$DIR/publish/linux-x64/OmniPos.Desktop" --edition=electronics "$@"
