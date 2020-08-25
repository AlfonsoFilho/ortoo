import { ActorObject, Message, WorkerState } from "../types";
import { createActorParams } from "./actor-params";
import { isMainThreadActor } from "../utils/is-main-thread-actor";
import { serialize } from "../utils/serialize";
import { deserialize } from "../utils/deserialize";
import { parseModule } from "../utils/parse-module";
import { createActor } from "./create-actor";

export function createPrivilegedActorParams(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    ...createActorParams(actor, message, ws),
    localSpawn: (msg: Message) => {
      createActor(msg, ws);
    },
    info: () => ws.actors,
    parseModule,
    serialize,
    deserialize,
    getWorkerState: () => ws,
    isMainThread: () => isMainThreadActor(actor.id),
    importModule: (url: string) => {
      if (!isMainThreadActor(actor.id)) {
        throw new Error("importModule must be executed in the main thread");
      }
      return import(url).then((mod) => mod.default);
    },
  };
}
