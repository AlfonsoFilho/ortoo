import { Message, WorkerState } from "../types";
import { send } from "../worker/send";
import { generateId } from "./generate-id";

export function futureMessage(msg: Message, ws: WorkerState): Promise<Message> {
  return new Promise((resolve) => {
    const msgId = generateId();

    self.addEventListener(
      "RESUME" + msgId,
      (e) => {
        resolve(e.detail);
      },
      { once: true }
    );

    send(
      {
        ...msg,
        id: msgId,
      },
      ws
    );
  });
}
