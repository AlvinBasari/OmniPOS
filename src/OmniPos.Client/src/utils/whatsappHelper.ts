import { DeviceServiceTicket } from '../types';

export const cleanPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.substring(1);
  }
  return cleaned;
};

export const generateServiceWhatsAppMessage = (
  ticket: DeviceServiceTicket,
  storeName: string = 'OmniPOS Service Center',
  storePhone: string = ''
): string => {
  let statusIndonesian = 'Diterima di Antrean Servis';
  let statusEmoji = '📝';

  switch (ticket.status) {
    case 'Received':
      statusIndonesian = 'Unit Diterima (Menunggu Antrean Pengecekan)';
      statusEmoji = '📥';
      break;
    case 'InInspection':
      statusIndonesian = 'Sedang Didiagnosis & Pengecekan Teknisi';
      statusEmoji = '🔍';
      break;
    case 'WaitingForCustomerApproval':
      statusIndonesian = 'Menunggu Konfirmasi Biaya dari Anda';
      statusEmoji = '⚠️';
      break;
    case 'WaitingForSpareParts':
      statusIndonesian = 'Menunggu Pengiriman Suku Cadang Original';
      statusEmoji = '📦';
      break;
    case 'Repairing':
      statusIndonesian = 'Sedang Dalam Proses Reparasi / Pengerjaan';
      statusEmoji = '⚙️';
      break;
    case 'CompletedReadyForPickup':
      statusIndonesian = 'SELESAI DIPERBAIKI - SIAP DIAMBIL';
      statusEmoji = '✅';
      break;
    case 'PickedUpAndPaid':
      statusIndonesian = 'Sudah Diambil & Lunas (Garansi Aktif)';
      statusEmoji = '🎉';
      break;
    case 'Cancelled':
      statusIndonesian = 'Dibatalkan / Tidak Dapat Diperbaiki';
      statusEmoji = '❌';
      break;
  }

  const lines = [
    `*INFORMASI REPARASI & SERVIS PERANGKAT*`,
    `*${storeName}*`,
    `----------------------------------------`,
    `Halo Bpk/Ibu *${ticket.customerName}*,`,
    `Berikut update terkini status perbaikan perangkat Anda:`,
    ``,
    `📋 *No. Tiket SPK*: \`${ticket.ticketNumber}\``,
    `📱 *Perangkat*: ${ticket.brandAndModel}`,
    `🔧 *Keluhan*: ${ticket.problemDescription}`,
    `${statusEmoji} *Status*: *${statusIndonesian}*`,
    ticket.assignedTechnicianName ? `👨‍🔧 *Teknisi*: ${ticket.assignedTechnicianName}` : '',
    ticket.technicianNotes ? `💬 *Catatan Teknisi*: _"${ticket.technicianNotes}"_` : '',
    ``,
    `----------------------------------------`,
    `💰 *Rincian Biaya*:`,
    `• Total Biaya: Rp ${ticket.finalCost.toLocaleString('id-ID')}`,
    `• Uang Muka (DP): Rp ${ticket.downPayment.toLocaleString('id-ID')}`,
    `• *Sisa Pelunasan*: *Rp ${ticket.remainingBalance.toLocaleString('id-ID')}*`,
    ticket.warrantyDaysGiven > 0 ? `🛡️ *Garansi Servis*: ${ticket.warrantyDaysGiven} Hari` : '',
    ``,
    ticket.status === 'CompletedReadyForPickup'
      ? `👉 *Unit sudah selesai diperbaiki dan siap diambil di toko pada jam operasional.* Harap tunjukkan pesan ini atau struk SPK saat pengambilan.`
      : `Kami akan terus memberikan kabar terkini terkait perkembangan perbaikan perangkat Anda.`,
    ``,
    `Terima kasih atas kepercayaan Anda!`,
    storePhone ? `📞 Layanan Pelanggan: ${storePhone}` : ''
  ].filter(line => line !== null && line !== undefined);

  return lines.join('\n');
};

export const generateReceiptWhatsAppMessage = (
  order: any,
  storeName: string = 'OmniPOS Store',
  storePhone: string = ''
): string => {
  const items = order.items || [];
  const lines = [
    `*STRUK PEMBELIAN RESMI*`,
    `*${storeName}*`,
    `----------------------------------------`,
    `No. Faktur : \`${order.invoiceNumber}\``,
    `Tanggal    : ${new Date(order.orderDate || Date.now()).toLocaleString('id-ID')}`,
    `Kasir      : ${order.cashierName || 'Kasir'}`,
    order.customerName ? `Pelanggan  : ${order.customerName}` : '',
    `----------------------------------------`,
    `*DAFTAR BARANG:*`
  ];

  items.forEach((item: any) => {
    lines.push(`• ${item.productName || item.name} x${item.quantity}`);
    lines.push(`  @ Rp ${item.unitPrice.toLocaleString('id-ID')} = *Rp ${item.totalPrice.toLocaleString('id-ID')}*`);
    if (item.serialNumber) {
      lines.push(`  _(SN/IMEI/No: ${item.serialNumber})_`);
    }
  });

  lines.push(`----------------------------------------`);
  lines.push(`Subtotal     : Rp ${(order.subtotal || order.totalAmount).toLocaleString('id-ID')}`);
  if (order.discountAmount > 0) {
    lines.push(`Diskon       : -Rp ${order.discountAmount.toLocaleString('id-ID')}`);
  }
  lines.push(`*TOTAL BAYAR : Rp ${order.totalAmount.toLocaleString('id-ID')}*`);
  if (order.paymentMethod) {
    lines.push(`Metode Bayar : ${order.paymentMethod}`);
  }
  lines.push(``);
  lines.push(`_Terima kasih telah berbelanja di ${storeName}!_`);
  lines.push(`_Barang bergaransi resmi dapat diklaim sesuai ketentuan faktur._`);
  if (storePhone) lines.push(`Bantuan/Kontak: ${storePhone}`);

  return lines.filter(l => l !== '').join('\n');
};

export const openWhatsAppUrl = (phone: string, text: string) => {
  const targetPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${targetPhone}?text=${encodedText}`;
  window.open(url, '_blank');
};
