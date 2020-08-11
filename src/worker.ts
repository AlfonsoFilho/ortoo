import { Message } from "./types";
import { deserialize } from "./utils";

export function worker(thread = self) {
  const SPAWN = "SPAWN";
  const SETUP_WORKER = "SETUP_WORKER";
  const STARTED = "STARTED";
  const DEFAULT = "DEFAULT";
  const RESUME = "RESUME";
  const SYSTEM = "SYSTEM";
  const REPLY = "REPLY";

  class ActorsNode {
    private autoIncrement = 0;
    private actors = {};
    private ctx = {};

    constructor() {}

    private createActor(handlers) {
      if (!(DEFAULT in handlers)) {
        handlers = {
          [DEFAULT]: handlers,
        };
      }

      const id = `${thread.name}.${this.autoIncrement++}`;

      const behavior = {
        history: [],
        current: DEFAULT,
        // default: settings.behavior.default,
      };

      // Object.setPrototypeOf(handlers[DEFAULT], {
      //   start(...a) {
      //     console.log("start default handler ", id, a);
      //   },
      //   stop() {
      //     console.log("stop default handler ", id);
      //   },
      // });

      const originalStart = handlers[DEFAULT].start;

      handlers[DEFAULT].start = (...params) => {
        if (typeof originalStart === "function") {
          originalStart(...params);
        }

        /*
             // Values
          "message",
          "id"
          "ctx",
          "links",
          "state",
          "behavior",
          // Methods
          "spawn",
          "tell",
          "ask",
          "reply",
          "become",
          "unbecome",
          "link",
           */
        const message = params[0];

        params[7]({
          type: STARTED,
          receiver: message.sender,
          sender: params[1],
          id: message.id,
        });
      };

      return {
        id,
        handlers,
        behavior,
        state: {},
        links: [],
      };
    }

    public async spawn(message) {
      console.log("spawn", message);
      const handlers = deserialize(message.payload);
      const actor = this.createActor(handlers);

      this.actors[actor.id] = actor;

      console.log("actors", this.actors);
      this.send({
        type: "start",
        receiver: actor.id,
        sender: message.sender,
        payload: undefined,
        id: message.id,
      });
    }

    public setContext(ctx: object) {
      this.ctx = ctx;
    }

    public send(message: Message) {
      // debugger;
      console.log("send?", message, thread.name);
      if (!message.id) {
        message.id = this.generateId();
      }

      if (!message.receiver) {
        throw new Error("Receiver missing");
      }

      if (message.receiver[0] === thread.name) {
        this.consume(message);
      } else {
        thread.postMessage(message);
      }
    }

    public generateId() {
      return Math.random().toString(32).substring(2, 12);
    }

    private tell(actorId: string, message: Message) {
      // console.log({ ...message, sender: actorId });
      this.send({ ...message, sender: actorId });
    }

    private consume(message: Message) {
      // console.log("consume ", thread.name, message);
      const actor = this.actors[message.receiver as any];
      const behavior = actor.behavior.current;

      if (message.type === REPLY || message.type === STARTED) {
        // console.log("here?", thread.name, RESUME + message.id, message);
        // console.log("thread??", thread, thread.dispatchEvent);
        thread.dispatchEvent(
          new CustomEvent(RESUME + message.id, { detail: message })
        );
      }

      if (message.type in actor.handlers[behavior]) {
        actor.handlers[behavior][message.type](
          /*
             // Values
          "message",
          "id"
          "ctx",
          "links",
          "state",
          "behavior",
          // Methods
          "spawn",
          "tell",
          "ask",
          "reply",
          "become",
          "unbecome",
          "link",
           */
          message,
          actor.id,
          this.ctx,
          actor.links,
          actor.state,
          actor.behavior.current,
          /* spawn */ async (url: string, options = {}) =>
            futureMessage(this, {
              type: "spawn",
              receiver: "0.0",
              sender: actor.id,
              payload: { code: url },
            }),

          /* tell */ this.tell.bind(this, actor.id),

          /* ask */ (msg: Message) =>
            futureMessage(this, {
              ...msg,
              sender: actor.id,
            })
        );
      } else {
        if (typeof actor.handlers[behavior].unknown === "function") {
          actor.handlers[behavior].unknown({ test: true });
        }
      }
    }
  }

  function futureMessage(_this: ActorsNode, msg: Message) {
    return new Promise((resolve, reject) => {
      const msgId = _this.generateId();

      thread.addEventListener(
        RESUME + msgId,
        (e) => {
          console.log("event!", e);
          resolve(e.detail.sender);
        },
        { once: true }
      );

      _this.send({
        ...msg,
        id: msgId,
      });
    });
  }

  const node = new ActorsNode();

  thread.onmessage = async ({ data }) => {
    switch (data.type) {
      case "SYSTEM_SPAWN": {
        node.spawn(data);
        break;
      }
      default: {
        node.send(data);
        break;
      }
    }
  };
}
