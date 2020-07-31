import { Message } from "./types";

export function worker() {
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

    public deserialize(txt) {
      const obj = JSON.parse(txt);
      const AsyncFunction = Object.getPrototypeOf(async function () {})
        .constructor;

      for (const prop in obj) {
        obj[prop] = new AsyncFunction(
          // Values
          "message",
          "id",
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
          obj[prop]
        );
      }

      return obj;
    }

    private createActor(handlers, url) {
      debugger;
      if (!Reflect.has(handlers, DEFAULT)) {
        handlers = {
          [DEFAULT]: handlers,
        };
      }

      const id = `${self.name}.${this.autoIncrement++}-${url}`;

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

    public async spawn(url, message) {
      const handlers = this.deserialize(message.payload.code);
      const actor = this.createActor(handlers, url);

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
      if (!message.id) {
        message.id = this.generateId();
      }

      if (!message.receiver) {
        throw new Error("Receiver missing");
      }

      if (message.receiver[0] === self.name) {
        this.consume(message);
      } else {
        self.postMessage(message);
      }
    }

    private generateId() {
      return Math.random().toString(32).substring(2, 12);
    }

    private tell(actorId: string, message: Message) {
      console.log({ ...message, sender: actorId });
      this.send({ ...message, sender: actorId });
    }

    private consume(message: Message) {
      console.log("consume ", self.name, message);
      const actor = this.actors[message.receiver as any];
      const behavior = actor.behavior.current;

      if (message.type === REPLY || message.type === STARTED) {
        console.log("here?", self.name, RESUME + message.id, message);
        self.dispatchEvent(
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
          async (url: string, options = {}) =>
            new Promise((resolve, reject) => {
              const msgId = this.generateId();
              console.log(
                "Added event listener",
                self.name,
                RESUME + msgId,
                url
              );
              self.addEventListener(
                RESUME + msgId,
                (e) => {
                  console.log("event!", e);
                  resolve(e.detail.sender);
                },
                { once: true }
              );

              this.send({
                type: SPAWN,
                receiver: SYSTEM,
                sender: actor.id,
                payload: { url },
                id: msgId,
              });
            }),
          this.tell.bind(this, actor.id)
        );
      } else {
        if (typeof actor.handlers[behavior].unknown === "function") {
          actor.handlers[behavior].unknown({ test: true });
        }
      }
    }
  }

  const node = new ActorsNode();

  self.onmessage = async ({ data }) => {
    // console.log(`worker ${self.name} received:`, data);
    switch (data.type) {
      case SPAWN: {
        node.spawn(data.payload.url, data);
        break;
      }
      case SETUP_WORKER: {
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
}
