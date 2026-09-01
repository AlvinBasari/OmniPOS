import requests
import json

BASE_URL = "http://127.0.0.1:5092"

print("\n--- 1. VERIFY APP MODE & SEED DATA FOR ELECTRONICS EDITION ---")
r_mode = requests.get(f"{BASE_URL}/api/v1/system/edition")
assert r_mode.status_code == 200, f"Failed: {r_mode.status_code}"
mode_info = r_mode.json()
print(f"[+] System Edition: {mode_info}")

r_prods = requests.get(f"{BASE_URL}/api/v1/products")
assert r_prods.status_code == 200
prods = r_prods.json()
print(f"[+] Loaded {len(prods)} products in Electronics catalog.")
samsung = next((p for p in prods if "Galaxy S24" in p["name"]), None)
assert samsung is not None, "Samsung S24 product not found in seed!"
print(f"[+] Found Galaxy S24: ID={samsung['id']}, Sku={samsung['sku']}, SellPrice={samsung['sellPrice']}")

print("\n--- 2. TEST IMEI & SERIAL NUMBERS INVENTORY ---")
r_serials = requests.get(f"{BASE_URL}/api/v1/electronics/serials")
assert r_serials.status_code == 200
serials = r_serials.json()
print(f"[+] Loaded {len(serials)} serial numbers/IMEIs in database.")
assert len(serials) >= 5, f"Expected at least 5 seeded serial numbers, got {len(serials)}"

print("\n--- 3. TEST QUICK WARRANTY SEARCH BY IMEI ---")
test_imei = "358921104829101"
r_search = requests.get(f"{BASE_URL}/api/v1/electronics/serials/search/{test_imei}")
assert r_search.status_code == 200
res_info = r_search.json()
print(f"[+] IMEI Search result: {res_info['productName']} | Status: {res_info['status']} | Notes: {res_info['warrantyNotes']}")
assert res_info["serialNo"] == test_imei

print("\n--- 4. TEST BATCH ADD NEW IMEI NUMBERS ---")
import time
ts = int(time.time()) % 100000
new_serial_1 = f"35892110{ts:05d}1"
new_serial_2 = f"35892110{ts:05d}2"
new_serial_3 = f"35892110{ts:05d}3"

batch_payload = {
    "productId": samsung["id"],
    "serialNumbers": [new_serial_1, new_serial_2, new_serial_3],
    "supplierName": "PT Erajaya Swasembada",
    "purchaseInvoiceNumber": "INV-SUPP-2026-001",
    "warrantyMonths": 12,
    "warrantyNotes": "Garansi Resmi SEIN 1 Tahun"
}
r_batch = requests.post(f"{BASE_URL}/api/v1/electronics/serials/batch-add", json=batch_payload)
assert r_batch.status_code == 200
batch_res = r_batch.json()
print(f"[+] Batch Add result: {batch_res['message']} (Count: {batch_res['count']})")
assert batch_res["count"] == 3

print("\n--- 5. TEST SERVICE CENTER / RMA SPK WORKFLOW ---")
# 5a. List Tickets
r_srv = requests.get(f"{BASE_URL}/api/v1/electronics/services")
assert r_srv.status_code == 200
srv_list = r_srv.json()
print(f"[+] Found {len(srv_list)} existing service tickets in system.")
assert len(srv_list) >= 2, "Expected seeded tickets to be present"

# 5b. Create New Service Ticket
srv_payload = {
    "customerName": "Ahmad Yani",
    "customerPhone": "0812-9988-7766",
    "customerEmail": "ahmad@gmail.com",
    "deviceType": "Smartphone",
    "brandAndModel": "Xiaomi 13T Pro",
    "imeiOrSerial": "359018274619280",
    "deviceColor": "Meadow Green",
    "passcodeOrPattern": "987654",
    "problemDescription": "Kamera belakang buram & lensa retak",
    "physicalCondition": "Mulus 95%",
    "accessoriesIncluded": "Unit + Dus",
    "estimatedCost": 750000,
    "downPayment": 200000,
    "assignedTechnicianName": "Rian (Senior Tech)",
    "technicianNotes": "Perlu penggantian modul lensa kamera belakang original",
    "warrantyDaysGiven": 30
}
r_create_srv = requests.post(f"{BASE_URL}/api/v1/electronics/services", json=srv_payload)
assert r_create_srv.status_code == 200
new_ticket = r_create_srv.json()
print(f"[+] Created Service Ticket: {new_ticket['ticketNumber']} | EstCost={new_ticket['estimatedCost']} | DP={new_ticket['downPayment']}")

# 5c. Add Sparepart to Ticket
item_payload = {
    "itemType": "SparePart",
    "name": "Modul Lensa Kamera Xiaomi 13T Original",
    "quantity": 1,
    "unitPrice": 600000
}
r_item = requests.post(f"{BASE_URL}/api/v1/electronics/services/{new_ticket['id']}/items", json=item_payload)
assert r_item.status_code == 200

# 5d. Update Status to Ready for Pickup
update_payload = {
    "status": "CompletedReadyForPickup",
    "technicianNotes": "Lensa baru selesai dipasang, hasil foto jernih 100%",
    "assignedTechnicianName": "Rian",
    "finalCost": 750000
}
r_update_srv = requests.put(f"{BASE_URL}/api/v1/electronics/services/{new_ticket['id']}/status", json=update_payload)
assert r_update_srv.status_code == 200
updated_srv = r_update_srv.json()
print(f"[+] Updated Ticket Status: {updated_srv['status']} | FinalCost={updated_srv['finalCost']} | Sisa={updated_srv['remainingBalance']}")

print("\n--- 6. TEST TRADE-IN / TUKAR TAMBAH ---")
trade_in_payload = {
    "customerName": "Denny Sumargo",
    "customerPhone": "0811-2233-4455",
    "deviceBrandModel": "iPhone 12 128GB Blue Ex-iBox",
    "imeiOrSerial": "353091827461029",
    "conditionGrade": "Grade A (Mulus)",
    "functionalNotes": "Face ID normal, BH 85%, TrueTone aktif",
    "accessoriesIncluded": "Unit + Box + Cable",
    "valuationAmount": 4500000,
    "receivedByUserId": "Kasir Gadget"
}
r_trade = requests.post(f"{BASE_URL}/api/v1/electronics/trade-in", json=trade_in_payload)
assert r_trade.status_code == 200
trade_res = r_trade.json()
print(f"[+] Trade-In recorded: {trade_res['tradeInNumber']} | Device={trade_res['deviceBrandModel']} | Valuation=Rp {trade_res['valuationAmount']:,}")

print("\n--- 7. TEST POS CHECKOUT WITH SPECIFIED IMEI UNIT ---")
checkout_payload = {
    "cashierUserId": "Kasir Gadget",
    "businessMode": "Electronics",
    "items": [
        {
            "productId": samsung["id"],
            "quantity": 1,
            "unitPrice": samsung["sellPrice"],
            "discountAmount": 0,
            "serialNumber": new_serial_1, # Newly added available IMEI
            "notes": "Pelanggan meminta nota bergaransi resmi"
        }
    ],
    "payments": [
        {
            "method": "DebitCard",
            "amount": samsung["sellPrice"],
            "referenceNumber": "EDC-BCA-9901"
        }
    ],
    "discountAmount": 0,
    "taxPercentage": 0,
    "serviceChargePercentage": 0,
    "roundingAmount": 0
}
r_checkout = requests.post(f"{BASE_URL}/api/v1/sales/checkout", json=checkout_payload)
assert r_checkout.status_code in [200, 201], f"Unexpected status: {r_checkout.status_code} - {r_checkout.text}"
order_res = r_checkout.json()
print(f"[+] Checkout Success! Invoice Number: {order_res['invoiceNumber']} | Total: Rp {order_res['totalAmount']:,}")

# Verify that the sold IMEI has been marked as Sold and warranty end date is populated
r_search_sold = requests.get(f"{BASE_URL}/api/v1/electronics/serials/search/{new_serial_1}")
assert r_search_sold.status_code == 200
sold_info = r_search_sold.json()
print(f"[+] Sold IMEI Verification: Status={sold_info['status']} | SoldInvoice={sold_info['soldInvoiceNumber']} | WarrantyEnd={sold_info['warrantyEndDate']}")
assert sold_info["status"] == "Sold"
assert sold_info["soldInvoiceNumber"] == order_res["invoiceNumber"]
assert sold_info["warrantyEndDate"] is not None

print("\n=======================================================")
print("🎉 ALL 7 ELECTRONICS & GADGET POS TESTS PASSED (100%)!")
print("=======================================================")
