/*
What a plugin can do?
- add actor param
- add actor handler
- intercept messages
- create an actor
*/

import { ActorObject, Message, WorkerState } from "../types";

export function usePlugins(
  actor: ActorObject,
  message: Message,
  ws: WorkerState,
  stage: "param",
  plugins: Function[]
) {
  return plugins.reduce((acc, plugin) => {
    return { ...acc, ...plugin(actor, message, ws, stage) };
  }, {});
}
