#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Warna Terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}${BOLD}"
echo "================================================================="
echo "   BASARI IT SOLUTIONS - OMNIPOS ENTERPRISE INSTALLER            "
echo "   Multi-Platform Desktop POS System (Linux & Windows)           "
echo "   Copyright (C) 2026 BASARI IT SOLUTIONS. All rights reserved. "
echo "================================================================="
echo -e "${NC}"
echo -e "Silakan pilih ${BOLD}Edisi Sistem Toko${NC} yang ingin Anda pasang di perangkat ini:"
echo -e "Setiap edisi akan terpasang sebagai aplikasi mandiri dengan database"
echo -e "terisolasi (tidak saling bercampur) dan menu khusus jenis usaha."
echo ""
echo -e "  ${GREEN}[1] 🛒 OmniPOS Retail & Minimarket${NC}"
echo -e "      (Sembako, Toko Kelontong, Barcode Cepat, Harga Grosir, Multi-Satuan, Kasbon)"
echo ""
echo -e "  ${YELLOW}[2] 🍽️  OmniPOS Resto, Kafe & Bakery (F&B)${NC}"
echo -e "      (Denah Meja Visual, Layar Dapur KDS, Split Bill, Resep Bahan Baku / BOM)"
echo ""
echo -e "  ${BLUE}[3] ✂️  OmniPOS Layanan, Barbershop & Laundry${NC}"
echo -e "      (Antrean Pengerjaan, Penugasan Staf/Teknisi, Komisi Karyawan, Estimasi Waktu)"
echo ""
echo -e "  ${MAGENTA}[4] 💊 OmniPOS Apotek & Toko Obat${NC}"
echo -e "      (Peringatan Kadaluarsa FEFO, No. Batch Pabrik, Resep Dokter, No. SIP Farmasi)"
echo ""
echo -e "  ${CYAN}[5] 📱 OmniPOS Gadget, Elektronik & IMEI${NC}"
echo -e "      (Pelacakan No. IMEI/Serial Number Unit, Kartu Garansi, Histori Klaim Servis)"
echo ""
echo -e "  ${BOLD}[6] 📦 Pasang Semua 5 Edisi Sekaligus (Aplikasi Terpisah)${NC}"
echo -e "  ${RED}[7] ❌ Batal / Keluar${NC}"
echo ""
read -p "Masukkan pilihan Anda [1-7]: " CHOICE

install_edition() {
    local KEY="$1"
    local NAME="$2"
    local DESC="$3"
    local ICON="$4"
    local DB="pos_${KEY}.db"
    local DESKTOP_FILE="$HOME/.local/share/applications/omnipos-${KEY}.desktop"

    echo ""
    echo -e "${CYAN}>>> Memasang: ${BOLD}${NAME}${NC}..."
    
    mkdir -p "$HOME/.local/share/applications"
    mkdir -p "$HOME/.local/bin"
    mkdir -p "$DIR/launchers"

    # Buat file launcher di .local/bin
    cat << EOF > "$HOME/.local/bin/omnipos-${KEY}"
#!/usr/bin/env bash
exec "$DIR/launchers/run-${KEY}.sh" "\$@"
EOF
    chmod +x "$HOME/.local/bin/omnipos-${KEY}"

    # Buat file shortcut .desktop untuk Application Menu Linux
    cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=${NAME}
Comment=${DESC}
Exec=${DIR}/launchers/run-${KEY}.sh
Icon=accessories-calculator
Terminal=false
Categories=Office;Finance;PointOfSale;
StartupNotify=true
EOF
    chmod +x "$DESKTOP_FILE"

    echo -e "  ${GREEN}✓${NC} Shortcut aplikasi desktop terdaftar: ${BOLD}${DESKTOP_FILE}${NC}"
    echo -e "  ${GREEN}✓${NC} Database terisolasi: ${BOLD}${DIR}/${DB}${NC}"
    echo -e "  ${GREEN}✓${NC} Perintah CLI: ${BOLD}omnipos-${KEY}${NC}"
}

case $CHOICE in
    1)
        install_edition "retail" "OmniPOS Retail & Minimarket" "Sistem Kasir Sembako & Barcode" "shopping-cart"
        ;;
    2)
        install_edition "resto" "OmniPOS Resto & Kafe" "Sistem Kasir F&B & Denah Meja" "utensils"
        ;;
    3)
        install_edition "services" "OmniPOS Layanan & Barbershop" "Sistem Kasir Jasa & Antrean" "scissors"
        ;;
    4)
        install_edition "pharmacy" "OmniPOS Apotek & Farmasi" "Sistem Kasir Obat & FEFO" "pill"
        ;;
    5)
        install_edition "electronics" "OmniPOS Gadget & Elektronik" "Sistem Kasir IMEI & Garansi" "smartphone"
        ;;
    6)
        install_edition "retail" "OmniPOS Retail & Minimarket" "Sistem Kasir Sembako & Barcode" "shopping-cart"
        install_edition "resto" "OmniPOS Resto & Kafe" "Sistem Kasir F&B & Denah Meja" "utensils"
        install_edition "services" "OmniPOS Layanan & Barbershop" "Sistem Kasir Jasa & Antrean" "scissors"
        install_edition "pharmacy" "OmniPOS Apotek & Farmasi" "Sistem Kasir Obat & FEFO" "pill"
        install_edition "electronics" "OmniPOS Gadget & Elektronik" "Sistem Kasir IMEI & Garansi" "smartphone"
        ;;
    7)
        echo "Instalasi dibatalkan."
        exit 0
        ;;
    *)
        echo -e "${RED}Pilihan tidak valid.${NC}"
        exit 1
        ;;
esac

# Update database mime / desktop database jika ada
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo -e "${GREEN}${BOLD}             INSTALASI OMNIPOS BERHASIL DISELESAIKAN!            ${NC}"
echo -e "${GREEN}${BOLD}=================================================================${NC}"
echo -e "Aplikasi sekarang telah terpasang di menu aplikasi Linux (App Launcher / Start Menu)."
echo -e "Anda dapat mencarinya langsung di pencarian aplikasi desktop dengan mengetik: ${BOLD}OmniPOS${NC}."
echo ""
echo -e "Atau Anda dapat menjalankannya langsung via terminal:"
case $CHOICE in
    1) echo -e "  ${BOLD}./launchers/run-retail.sh${NC}" ;;
    2) echo -e "  ${BOLD}./launchers/run-resto.sh${NC}" ;;
    3) echo -e "  ${BOLD}./launchers/run-services.sh${NC}" ;;
    4) echo -e "  ${BOLD}./launchers/run-pharmacy.sh${NC}" ;;
    5) echo -e "  ${BOLD}./launchers/run-electronics.sh${NC}" ;;
    6) 
       echo -e "  ${BOLD}./launchers/run-retail.sh${NC}"
       echo -e "  ${BOLD}./launchers/run-resto.sh${NC}"
       echo -e "  ${BOLD}./launchers/run-services.sh${NC}"
       echo -e "  ${BOLD}./launchers/run-pharmacy.sh${NC}"
       echo -e "  ${BOLD}./launchers/run-electronics.sh${NC}"
       ;;
esac
echo ""
read -p "Apakah Anda ingin membuka aplikasi sekarang? (y/n): " LAUNCH_NOW
if [[ "$LAUNCH_NOW" =~ ^[Yy]$ ]]; then
    case $CHOICE in
        1|6) "$DIR/launchers/run-retail.sh" ;;
        2) "$DIR/launchers/run-resto.sh" ;;
        3) "$DIR/launchers/run-services.sh" ;;
        4) "$DIR/launchers/run-pharmacy.sh" ;;
        5) "$DIR/launchers/run-electronics.sh" ;;
    esac
fi
