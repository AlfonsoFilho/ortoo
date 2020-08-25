import { Message, WorkerState } from "../types";
import { createActorParams } from "./actor-params";
import { createPrivilegedActorParams } from "./privileged-actor-params";

export function consume(message: Message, ws: WorkerState) {
  const actor = ws.actors[message.receiver];
  const behavior = actor.behavior._current;

  if (message.type === "REPLY" || message.type === "STARTED") {
    self.dispatchEvent(
      new CustomEvent("RESUME" + message.id, { detail: message })
    );
  }

  if (message.type in actor.handlers[behavior]) {
    const actorParams =
      actor.id.split(".")[1] === "0"
        ? createPrivilegedActorParams(actor, message, ws)
        : createActorParams(actor, message, ws);

    actor.handlers[behavior][message.type](actorParams);
  } else {
    if (typeof actor.handlers[behavior].otherwise === "function") {
      actor.handlers[behavior].otherwise({ test: true });
    } else {
      ws.deadLetters.push(message);
    }
  }
}
