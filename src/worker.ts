import { Message } from "./types";

export function worker(thread = self) {
  function serialize(localMod) {
    return JSON.stringify(localMod, (k, v) => {
      if (typeof v === "function") {
        const code = v.toString();
        return code
          .replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "")
          .substring(code.indexOf("{") + 1, code.lastIndexOf("}"))
          .trim();
      }
      return v;
    });
  }

  function deserialize(txt) {
    const { config = {}, ...obj } = JSON.parse(txt);
    const AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor;

    for (const prop in obj) {
      obj[prop] = new AsyncFunction("fromActor", obj[prop]);
    }

    return { ...obj, config };
  }

  const STARTED = "STARTED";
  const DEFAULT = "DEFAULT";
  const RESUME = "RESUME";
  const REPLY = "REPLY";

  class ActorsNode {
    private autoIncrement = 0;
    private actors = {};
    private ctx = {
      id: thread.name,
    };

    constructor() {
      thread.onmessage = ({ data }) => node.send(data);
    }

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

      handlers[DEFAULT].start = (fromActor) => {
        if (typeof originalStart === "function") {
          originalStart(fromActor);
        }

        const { id, message, tell } = fromActor;

        tell({
          type: STARTED,
          receiver: message.sender,
          sender: id,
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

    public async spawn(message: Message) {
      // console.log("spawn", thread.name, message);
      const handlers = deserialize(message.payload);
      const actor = this.createActor(handlers);

      this.actors[actor.id] = actor;

      // console.log("actors", this.actors);
      this.send({
        type: "start",
        receiver: actor.id,
        sender: message.sender,
        payload: undefined,
        id: message.id,
      });
    }

    public send(message: Message) {
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

    private consume(message: Message) {
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
        const fromActor = {
          // Values
          message,
          id: actor.id,
          context: this.ctx,
          links: actor.links,
          behavior: actor.behavior.current,

          // Methods
          spawn: (url: string) => {
            futureMessage(this, {
              type: "spawn",
              receiver: thread.name + ".0",
              sender: actor.id,
              payload: { code: url },
            });
          },
          tell: (msg: Message) => this.send({ ...msg, sender: actor.id }),
          ask: (msg: Message) =>
            futureMessage(this, {
              ...msg,
              sender: actor.id,
            }),
          reply: () => {},
          become: () => {},
          unbecome: () => {},
          link: () => {},
          setState: (newState) => {
            actor.state = newState;
          },
          getState: () => actor.state,
        };

        // TODO: enable this only for thread actors
        if (true) {
          Object.setPrototypeOf(fromActor, {
            localSpawn: (msg) => {
              console.log("localSpawn");
              this.spawn(msg);
            },
          });
        }

        actor.handlers[behavior][message.type](fromActor);
      } else {
        if (typeof actor.handlers[behavior].unknown === "function") {
          actor.handlers[behavior].otherwise({ test: true });
        }
      }
    }
  }

  function futureMessage(_this: ActorsNode, msg: Message) {
    return new Promise((resolve) => {
      const msgId = _this.generateId();

      thread.addEventListener(
        RESUME + msgId,
        (e) => {
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

  const threadActor = {
    async thread() {},
    async start() {
      //@ts-ignore
      console.log("thread actor", fromActor);
    },
    async spawn() {
      //@ts-ignore
      const { message, localSpawn, context } = fromActor;
      console.log("spawn??????", message);
      console.log("context", context);
      localSpawn(message);
    },
  };

  node.spawn({
    receiver: `${thread.name}.0`,
    type: "SPAWN",
    sender: "0.0",
    payload: serialize(threadActor),
  });
}
