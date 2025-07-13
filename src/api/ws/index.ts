import type { ServerWebSocket } from "bun";
import { createBunWebSocket } from "hono/bun";

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

export { websocket };

export const wsHandler = upgradeWebSocket((ctx) => ({
  onOpen(evt, ws) {
    console.log("Connection opened");
  },
  onMessage(evt, ws) {
    const { data } = evt;
    console.log(`Message from client: ${data}`);
    ws.send("Hello from server!");
  },
  onClose: () => {
    console.log("Connection closed");
  },
}));
