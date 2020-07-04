/**
 * @typedef {import("./types").Message} Message
 * @typedef {import("./types").Context} Context
 */

import {
  SPAWN,
  REPLY,
  CONTEXT_SET,
  SYSTEM,
  STARTED,
  RESUME,
  BEHAVIOR_HISTORY_LIMIT,
} from "./constants.mjs";

class ActorsNode {
  constructor() {
    this.autoIncrement = 0;
    this.actors = {};
    this.ctx = {};
  }

  /**
           * @param {string} url
           * @param {Message} message
           * @returns { Promise<void> }
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
        payload: undefined,
        id: message.id,
      },
    );
  }

  /**
           * @returns {string}
           */
  generateID() {
    return Math.random().toString(32).substring(2, 12);
  }

  /**
           * @param {Message} message
           */
  send(message) {
    if (!message.id) {
      message.id = this.generateID();
    }

    if (message.receiver && message.receiver[0] === self.name) {
      switch (message.type) {
        case SPAWN:
          this.spawn(message);
          break;

        default:
          break;
      }
      this.readAndAct(message);
    } else {
      postMessage(message);
    }
  }

  /**
           * @param { Context } ctx - System context
           */
  setContext(ctx) {
    this.ctx = ctx;
  }

  /**
           * @param {Message} message
           */
  readAndAct(message) {
    /** @type {import("./types").Actor} */
    const actor = this.actors[message.receiver];
    const behavior = actor.behavior.current;

    if (message.type === REPLY || message.type === STARTED) {
      self.dispatchEvent(
        new CustomEvent(RESUME + message.id, { detail: message.sender }),
      );
    }

    const params = {
      type: message.type,
      receiver: message.receiver,
      sender: message.sender,
      payload: message.payload,
      ctx: this.ctx,
      id: actor.id,
      messageId: message.id,
      spawn: async (url, options = {}) =>
        new Promise((resolve, reject) => {
          const msgId = this.generateID();

          self.addEventListener(RESUME + msgId, (e) =>
            resolve(e.detail), { once: true });
          this.send(
            {
              type: SPAWN,
              receiver: SYSTEM,
              sender: actor.id,
              payload: { url },
              id: msgId,
            },
          );
        }),
      link: () => {},
      become: (behavior) => {
        if (actor.behavior.history.length <= BEHAVIOR_HISTORY_LIMIT) {
          actor.behavior.history.push(actor.behavior.current);
        } else {
          const [_, ...history] = actor.behavior.history;
          actor.behavior.history = [...history, actor.behavior.current];
        }

        actor.behavior.current = behavior;
      },
      unbecome: () => {
        if (actor.behavior.history.length > 0) {
          actor.behavior.current = actor.behavior.history.pop();
        } else {
          actor.behavior.current = actor.behavior.default;
        }
      },
      tell: (msg) => {
        this.send({ ...msg, sender: actor.id });
      },
      reply: (msg) => {
        this.send(
          {
            ...msg,
            type: REPLY,
            sender: actor.id,
            receiver: message.sender,
            id: message.id,
          },
        );
      },
      ask: async (msg) =>
        new Promise((resolve, reject) => {
          self.addEventListener(RESUME + message.id, (e) =>
            resolve(e.detail), { once: true });
          this.send({ ...msg, sender: actor.id, id: message.id });
        }),
    };

    if (message.type in actor.handlers[behavior]) {
      actor.handlers[behavior][message.type](params);
    } else {
      if (typeof actor.handlers[behavior].unknown === "function") {
        actor.handlers[behavior].unknown(params);
      }
    }
  }
}

const node = new ActorsNode();

/**
 * @param { { data: Message } }
 */
onmessage = async ({ data }) => {
  // node.send(data)
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
      // console.log('message', self.name, data)
      node.send(data);
      break;
    }
  }
};
