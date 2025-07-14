import Emittery from "emittery";
import { upgradeWebSocket } from "../../utils/socket";

const emitter = new Emittery();

export const chat = upgradeWebSocket(() => {
  const offs: (() => void)[] = [];
  return {
    onOpen(evt, ws) {},
    onMessage(event) {
      const { data } = event;
      if (typeof data !== "string") return;
      try {
        const [type, content] = JSON.parse(data);
        emitter.emit(type, content);
      } catch (error) {
        console.error(error);
      }
    },
    onClose: () => {
      offs.forEach((off) => off());
    },
  };
});
