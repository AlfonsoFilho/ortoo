import { ActorObject, Message, WorkerState } from "../types";
import { send } from "../worker/send";
import { futureMessage } from "../utils/future-message";

export function messagingPlugin(
  actor: ActorObject,
  message: Message,
  ws: WorkerState,
  stage: string
) {
  const hooks = {
    param: {
      tell(msg: Message) {
        console.log("<< tell from plugin");
        send(msg, ws);
      },
      ask(msg: Exclude<Message, "sender">) {
        console.log("<< ask from plugin");
        return futureMessage(
          {
            ...msg,
            sender: actor.id,
          },
          ws
        );
      },
      reply(msg: Partial<Message>) {
        console.log("<< reply from plugin");
        if (message.sender) {
          send(
            {
              ...msg,
              type: "REPLY",
              sender: actor.id,
              receiver: message.sender,
              id: message.id,
            },
            ws
          );
        }
      },
      broadcast(msg: Message) {
        send(
          {
            ...msg,
            receiver: "*",
          },
          ws
        );
      },
    },
  };

  return hooks[stage];
}
