using Microsoft.AspNetCore.SignalR;
using OmniPos.Application.DTOs;

namespace OmniPos.Server.Hubs;

public class PosHub : Hub
{
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
