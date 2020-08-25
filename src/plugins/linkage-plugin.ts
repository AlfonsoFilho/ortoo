import { ActorObject, Message, WorkerState } from "../types";
import { futureMessage } from "../utils/future-message";

export function linkagePlugin(
  actor: ActorObject,
  _message: Message,
  ws: WorkerState,
  stage: string
) {
  const hooks = {
    param: {
      async link(id: string) {
        const resp = await futureMessage(
          {
            type: "link",
            receiver: id,
            sender: actor.id,
          },
          ws
        );
        actor.links.push(id);
        return true;
      },
      async unlink(id: string) {
        const resp = await futureMessage(
          {
            type: "link",
            receiver: id,
            sender: actor.id,
          },
          ws
        );
        actor.links = actor.links.filter((it) => it !== id);
        return true;
      },
    },
  };

  return hooks[stage];
}
