import { SPAWN } from "./constants.mjs";
import { CONTEXT_SET } from "./constants.mjs";
import { SYSTEM } from "./constants.mjs";
import { STARTED } from "./constants.mjs";

/**
 * @typedef {import("./types").Message} Message
 */

class ActorsNode {
  constructor() {
    this.autoIncrement = 0;
    this.actors = {};
    this.ctx = {};
  }

  /**
         * @param url {string}
         */
  async spawn(url, message) {
    const actorDef = await import(url).then((mod) => mod.default);
    const actor = actorDef.spawn(self.name, ++this.autoIncrement, url);

    this.actors[actor.id] = actor;

    this.send(
      {
        type: "start",
        receiver: actor.id,
        sender: message.sender,
        payload: "spawining",
      },
    );
  }

  /**
       * @param message {Message}
       */
  send(message) {
    if (message.receiver && message.receiver[0] === self.name) {
      this.readAndAct(message);
    } else {
      postMessage(message);
    }
  }

  setContext(ctx) {
    this.ctx = ctx;
  }

  /**
       * @param message {Message}
       */
  readAndAct(message) {
    const actor = this.actors[message.receiver];
    const behavior = actor.behavior.current;

    if (message.type === STARTED) {
      self.dispatchEvent(
        new CustomEvent("::resume", { detail: message.sender }),
      );
    }

    if (message.type in actor.handlers[behavior]) {
      actor.handlers[behavior][message.type](
        {
          type: message.type,
          receiver: message.receiver,
          sender: message.sender,
          payload: message.payload,
          ctx: this.ctx,
          id: actor.id,
          spawn: async (url, options = {}) =>
            new Promise((resolve, reject) => {
              self.addEventListener("::resume", (e) =>
                resolve(e.detail), { once: true });
              this.send(
                {
                  type: SPAWN,
                  receiver: SYSTEM,
                  sender: actor.id,
                  payload: { url },
                },
              );
            }),
          link: () => {},
          become: () => {},
          unbecome: () => {},
          tell: (msg) => {
            this.send({ ...msg, sender: actor.id });
          },
          ask: async () =>
            new Promise(() => {
              self.addEventListener("::resume", (e) =>
                resolve(e.detail), { once: true });
              this.send({ ...msg, sender: actor.id });
            }),
        },
      );
    }
  }
}

const node = new ActorsNode();

onmessage = async ({ data }) => {
  switch (data.type) {
    case SPAWN: {
      node.spawn(data.payload.url, data);
      break;
    }

    case CONTEXT_SET: {
      node.setContext(data.payload);
      break;
    }

    case STARTED:
    default: {
      node.send(data);
      break;
    }
  }
};
