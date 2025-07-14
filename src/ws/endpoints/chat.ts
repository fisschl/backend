import Emittery from "emittery";
import { upgradeWebSocket } from "../../utils/socket";

const chatEmitter = new Emittery();

export const chat = upgradeWebSocket((ctx) => {
  const { room } = ctx.req.query();
  const offs: (() => void)[] = [];
  return {
    onOpen(evt, ws) {
      offs.push(
        chatEmitter.on(`${room}:message`, (data) => {
          ws.send(data);
        }),
      );
    },
    onMessage(evt) {
      const { data } = evt;
      if (typeof data !== "string") return;
      chatEmitter.emit(`${room}:message`, data);
    },
    onClose: () => {
      offs.forEach((off) => off());
    },
  };
});
