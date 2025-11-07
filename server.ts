const PORT = Number(Deno.env.get("PORT") || 8000);

const clients = new Set<WebSocket>();

Deno.serve({ port: PORT }, (req: Request) => {
  const upgrade = req.headers.get("upgrade")?.toLowerCase();
  if (upgrade !== "websocket") {
    return new Response("Use ws:// or wss://", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  clients.add(socket);
  console.log(`Client connected → ${clients.size} online`);

  socket.onopen = () => socket.send(JSON.stringify({ type: "welcome" }));

  socket.onmessage = (e) => {
    console.log("Client says:", e.data);
  };

  socket.onclose = () => {
    clients.delete(socket);
    console.log(`Client left → ${clients.size} online`);
  };

  return response;
});

// ---------- ADMIN API to push notifications ----------
if (import.meta.main) {
  // Simple HTTP endpoint
  Deno.serve({ port: PORT + 1 }, async (req) => {
    if (req.method !== "POST") return new Response("POST only", { status: 405 });
    const { title, body } = await req.json();
    const payload = JSON.stringify({ type: "notification", title, body });

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
    return new Response("Sent to " + clients.size + " clients");
  }); 
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`POST notifications → http://localhost:${PORT + 1}`);
}