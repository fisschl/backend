import type { ServerWebSocket } from "bun";
import { createBunWebSocket } from "hono/bun";

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();
export { websocket };

export const socket = upgradeWebSocket((ctx) => {
  return {
    onOpen(evt, ws) {},
    onMessage(event, ws) {
      console.log(`Message from client: ${event.data}`);
      ws.send("Hello from server!");
    },
    onClose: () => {
      console.log("Connection closed");
    },
  };
});
