import { WorkerState, ThreadActorParams, Message } from "../types";
import { deserialize } from "../utils/deserialize";
import { send } from "./send";

/**
 * tested: no
 * status: not ready
 * pending:
 *  - clean comments
 *  - implement original handlers
 *  - implement behaviors
 */
export function makeActorObject(actorDefinition, ws: WorkerState) {
  // Ensure and actor has at leas one behavior
  if (!("DEFAULT" in actorDefinition)) {
    actorDefinition = {
      ["DEFAULT"]: actorDefinition,
    };
  }

  const id = `${ws.workerId}.${ws.autoIncrement++}`;

  const behavior = {
    _history: [] as string[],
    _current: actorDefinition.config ?? "DEFAULT",
    // default: settings.behavior.default,
  };

  const originalStart = actorDefinition[behavior._current].start;
  const originalInfo = actorDefinition[behavior._current].info;

  actorDefinition[behavior._current].start = (
    messageProps: ThreadActorParams
  ) => {
    if (typeof originalStart === "function") {
      originalStart(messageProps);
    }

    const { id, message, tell } = messageProps;
    if (message.sender) {
      tell({
        type: "STARTED",
        receiver: message.sender,
        sender: id,
        id: message.id,
      });
    }
  };

  actorDefinition[behavior._current].link = ({ links, sender, reply }) => {
    links.push(sender);
    reply({});
  };

  actorDefinition[behavior._current].info = (msg) => {
    const { reply, id, state, behavior } = msg;
    console.log("INF??", originalInfo);
    if (typeof originalInfo === "function") {
      originalInfo(msg);
    }
    reply({ payload: { id, state, behavior } });
  };

  return {
    id,
    handlers: actorDefinition,
    behavior,
    state: {},
    links: [] as string[],
  };
}

/**
 * tested: no
 * status: ready
 * pending:
 */
export async function createActor(message: Message, ws: WorkerState) {
  const handlers = deserialize(message.payload);
  const actor = makeActorObject(handlers, ws);

  ws.actors[actor.id] = actor;

  send(
    {
      type: "start",
      receiver: actor.id,
      sender: message.sender,
      payload: undefined,
      id: message.id,
    },
    ws
  );
}
