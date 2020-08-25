import { ActorObject, Message, WorkerState } from "../types";
import { messagingPlugin } from "../plugins/messaging-plugin";
import { behaviorPlugin } from "../plugins/behavior-plugin";
import { linkagePlugin } from "../plugins/linkage-plugin";
import { statePlugin } from "../plugins/state-plugin";
import { serialize } from "../utils/serialize";
import { getSpawnWorker } from "../worker";
import { futureMessage } from "../utils/future-message";
import { usePlugins } from "../plugins/use-plugins";

export function createActorParams(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    // Values
    message,
    id: actor.id,
    context: ws,
    links: actor.links,
    behavior: actor.behavior._current,

    ...usePlugins(actor, message, ws, "param", [
      messagingPlugin,
      behaviorPlugin,
      linkagePlugin,
      statePlugin,
    ]),

    // Methods
    async spawn(actorDefinition: string) {
      // TODO: fix typing
      const payload =
        typeof actorDefinition === "string"
          ? { url: actorDefinition }
          : { code: serialize(actorDefinition) };

      const msg = {
        type: "spawn",
        receiver: getSpawnWorker(ws),
        sender: actor.id,
        payload,
      };

      const resp = await futureMessage(msg, ws);

      return resp.sender;
    },
  };
}
