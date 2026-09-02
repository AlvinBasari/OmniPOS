using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using OmniPos.Application.DTOs;

namespace OmniPos.Server.Hubs;

public class PosHub : Hub
{
    private static readonly ConcurrentDictionary<string, string> CfdClients = new();
    private static readonly ConcurrentDictionary<string, string> KdsClients = new();
    private static readonly ConcurrentDictionary<string, string> MobileScannerClients = new();

    public static int CfdConnectionsCount => CfdClients.Count;
    public static int KdsConnectionsCount => KdsClients.Count;
    public static int MobileScannerConnectionsCount => MobileScannerClients.Count;

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        CfdClients.TryRemove(Context.ConnectionId, out _);
        KdsClients.TryRemove(Context.ConnectionId, out _);
        MobileScannerClients.TryRemove(Context.ConnectionId, out _);
        return base.OnDisconnectedAsync(exception);
    }

    public Task RegisterCfd()
    {
        CfdClients[Context.ConnectionId] = DateTime.UtcNow.ToString("o");
        return Groups.AddToGroupAsync(Context.ConnectionId, "CFD");
    }

    public Task RegisterKds()
    {
        KdsClients[Context.ConnectionId] = DateTime.UtcNow.ToString("o");
        return Groups.AddToGroupAsync(Context.ConnectionId, "KDS");
    }

    public Task RegisterMobileScanner(string? deviceName = null)
    {
        MobileScannerClients[Context.ConnectionId] = deviceName ?? "Android Phone";
        return Groups.AddToGroupAsync(Context.ConnectionId, "MOBILE_SCANNERS");
    }

    public async Task SendMobileScan(string barcode, string? deviceName = null)
    {
        await Clients.Others.SendAsync("MobileBarcodeScanned", new 
        { 
            barcode = barcode.Trim(), 
            deviceName = deviceName ?? "HP Android", 
            timestamp = DateTime.UtcNow.ToString("o") 
        });
    }

    public async Task SendOrderToKitchen(OrderResponseDto order)
    {
        await Clients.Others.SendAsync("ReceiveKitchenOrder", order);
    }

    public async Task UpdateTableStatus(string tableId, string status)
    {
        await Clients.All.SendAsync("TableStatusUpdated", tableId, status);
    }

    public async Task UpdateCfdCart(object cartPayload)
    {
        await Clients.Others.SendAsync("CfdCartUpdated", cartPayload);
    }

    public async Task UpdateCfdQris(DynamicQrisResponse qris)
    {
        await Clients.Others.SendAsync("CfdQrisDisplay", qris);
    }

    public async Task NotifyKdsItemCompleted(string orderItemId, string status)
    {
        await Clients.All.SendAsync("KdsItemStatusChanged", orderItemId, status);
    }
}
