#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "  Meluncurkan OmniPOS Desktop (Native Desktop Linux App)  "
echo "=========================================================="

export PATH=$HOME/.dotnet:$HOME/.nodejs/bin:$PATH

# 1. Bersihkan port dan proses lama jika ada
pkill -9 -f "OmniPos.Desktop" 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
rm -rf ~/.cache/OmniPos.Desktop ~/.cache/webkitgtk 2>/dev/null || true
sleep 0.3

# 2. Setup library compatibility link untuk WebKitGTK di Linux
mkdir -p "$DIR/publish/linux-x64"

# Salin Photino.Native.so jika belum ada
if [ ! -f "$DIR/publish/linux-x64/Photino.Native.so" ]; then
    find "$HOME/.nuget/packages" -path "*/linux-x64/native/Photino.Native.so" -exec cp {} "$DIR/publish/linux-x64/" \; -quit 2>/dev/null || true
fi

# Buat symlink kompatibilitas otomatis ke libwebkit2gtk-4.1
WEBKIT_PATH=$(find /lib /usr/lib -name "libwebkit2gtk-4.1.so.0" -print -quit 2>/dev/null || true)
JS_PATH=$(find /lib /usr/lib -name "libjavascriptcoregtk-4.1.so.0" -print -quit 2>/dev/null || true)

if [ -n "$WEBKIT_PATH" ] && [ ! -f "$DIR/publish/linux-x64/libwebkit2gtk-4.0.so.37" ]; then
    ln -sf "$WEBKIT_PATH" "$DIR/publish/linux-x64/libwebkit2gtk-4.0.so.37"
fi

if [ -n "$JS_PATH" ] && [ ! -f "$DIR/publish/linux-x64/libjavascriptcoregtk-4.0.so.18" ]; then
    ln -sf "$JS_PATH" "$DIR/publish/linux-x64/libjavascriptcoregtk-4.0.so.18"
fi

# 3. Environment flags untuk stabilitas rendering & koneksi lokal di Ubuntu 24/22 & Debian
export LD_LIBRARY_PATH="$DIR/publish/linux-x64:$LD_LIBRARY_PATH"
export GDK_BACKEND=x11,wayland,*
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
export no_proxy="localhost,127.0.0.1,::1,$no_proxy"
# 4. Tentukan Edisi Toko
echo ">>> Membuka jendela aplikasi desktop kasir OmniPOS..."
exec "$DIR/publish/linux-x64/OmniPos.Desktop" "$@"

