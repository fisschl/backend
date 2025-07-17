import Emittery from "emittery";
import { Hono } from "hono";
import { upgradeWebSocket } from "../../utils/socket";

const emitRoom = new Emittery();

const room = upgradeWebSocket((ctx) => {
  const { room } = ctx.req.query();
  const offs: (() => void)[] = [];
  return {
    onOpen(evt, ws) {
      offs.push(
        emitRoom.on(`${room}:message`, (data) => {
          ws.send(data);
        }),
      );
    },
    onMessage(evt) {
      const { data } = evt;
      if (typeof data !== "string") return;
      emitRoom.emit(`${room}:message`, data);
    },
    onClose: () => {
      offs.forEach((off) => off());
    },
  };
});

export const chat = new Hono().get("/room", room);
