#!/usr/bin/env bash
# OmniPOS Linux Quick Launcher Script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLISH_DIR="$DIR/publish/linux-x64"

export DOTNET_ROOT="${DOTNET_ROOT:-/home/alvin/.dotnet}"
export PATH="$DOTNET_ROOT:${PATH:-/usr/local/bin:/usr/bin:/bin}"
export LD_LIBRARY_PATH="$PUBLISH_DIR:${LD_LIBRARY_PATH:-}"

EDITION="${1:-retail}"
if [ "$1" = "retail" ] || [ "$1" = "fnb" ] || [ "$1" = "resto" ] || [ "$1" = "pharmacy" ] || [ "$1" = "apotek" ] || [ "$1" = "services" ] || [ "$1" = "jasa" ] || [ "$1" = "electronics" ]; then
    shift
fi

# 1. Periksa apakah OmniPOS sudah aktif di port 5000
HTTP_CHECK=$(curl -s -m 1 -o /dev/null -w "%{http_code}" "http://127.0.0.1:5000/api/v1/hardware/status" 2>/dev/null || echo "000")

if [ "$HTTP_CHECK" = "200" ]; then
    echo "OmniPOS sudah aktif di http://127.0.0.1:5000. Membuka jendela kasir..."
    if command -v notify-send >/dev/null 2>&1; then
        notify-send -i "$DIR/assets/omnipos-icon.png" "OmniPOS Kasir" "Aplikasi kasir sudah aktif, menampilkan layar kasir..." 2>/dev/null || true
    fi
    if command -v google-chrome >/dev/null 2>&1; then
        exec google-chrome --app="http://127.0.0.1:5000" "$@"
    elif command -v google-chrome-stable >/dev/null 2>&1; then
        exec google-chrome-stable --app="http://127.0.0.1:5000" "$@"
    elif command -v xdg-open >/dev/null 2>&1; then
        exec xdg-open "http://127.0.0.1:5000"
    fi
    exit 0
fi

echo "=========================================================="
echo " Memulai OmniPOS Desktop ($EDITION)..."
echo "=========================================================="

if command -v notify-send >/dev/null 2>&1; then
    notify-send -i "$DIR/assets/omnipos-icon.png" "OmniPOS Kasir" "Memulai aplikasi kasir OmniPOS ($EDITION)..." 2>/dev/null || true
fi

exec "$PUBLISH_DIR/OmniPos.Desktop" -e "$EDITION" "$@"

