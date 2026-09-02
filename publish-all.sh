#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================"
echo "  OmniPOS - Build & Publish All (Linux & Windows 11)"
echo "========================================================"

export PATH=$HOME/.dotnet:$HOME/.nodejs/bin:$PATH

pkill -9 -f "OmniPos.Desktop" 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
rm -f publish/linux-x64/OmniPos.Desktop publish/win-x64/OmniPos.Desktop.exe 2>/dev/null || true
sleep 0.5

# 1. Build React Client
echo ">>> [1/3] Membangun Frontend React (Vite & Tailwind)..."
cd src/OmniPos.Client
npx vite build
cd "$DIR"

# 2. Publish Linux x64 Standalone Executable
echo ">>> [2/3] Mengompilasi Biner Desktop Linux (x64)..."
dotnet publish src/OmniPos.Desktop/OmniPos.Desktop.csproj \
    -c Release \
    -r linux-x64 \
    --self-contained true \
    -p:PublishSingleFile=true \
    -o publish/linux-x64

# Copy static assets and WebKit native dependencies for Linux
cp -r src/OmniPos.Server/wwwroot publish/linux-x64/
find "$HOME/.nuget/packages" -path "*/linux-x64/native/Photino.Native.so" -exec cp {} publish/linux-x64/ \; -quit 2>/dev/null || true

# Auto-link WebKitGTK 4.1 to 4.0 compatibility
WEBKIT_PATH=$(find /lib /usr/lib -name "libwebkit2gtk-4.1.so.0" -print -quit 2>/dev/null || true)
JS_PATH=$(find /lib /usr/lib -name "libjavascriptcoregtk-4.1.so.0" -print -quit 2>/dev/null || true)
if [ -n "$WEBKIT_PATH" ]; then
    ln -sf "$WEBKIT_PATH" publish/linux-x64/libwebkit2gtk-4.0.so.37
fi
if [ -n "$JS_PATH" ]; then
    ln -sf "$JS_PATH" publish/linux-x64/libjavascriptcoregtk-4.0.so.18
fi

# 3. Publish Windows 11 x64 Executable (.exe)
echo ">>> [3/3] Mengompilasi Biner Desktop Windows 11 (win-x64 .exe)..."
dotnet publish src/OmniPos.Desktop/OmniPos.Desktop.csproj \
    -c Release \
    -r win-x64 \
    -o publish/win-x64
cp -r src/OmniPos.Server/wwwroot publish/win-x64/

chmod +x run-desktop-linux.sh publish/linux-x64/OmniPos.Desktop launchers/*.sh 2>/dev/null || true

echo ""
echo "========================================================"
echo "  SELESAI! Biner Desktop Siap Digunakan:"
echo "  - Linux:      publish/linux-x64/OmniPos.Desktop"
echo "  - Windows 11: publish/win-x64/OmniPos.Desktop.exe"
echo "========================================================"
