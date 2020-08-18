import { Message } from "./types";

export function worker(thread = self) {
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

    /**
     * Get an actor definition and return a concrete actor object
     * @param actorDefinition
     */
    private makeActorObject(actorDefinition) {
      if (!(DEFAULT in actorDefinition)) {
        actorDefinition = {
          [DEFAULT]: actorDefinition,
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

      const originalStart = actorDefinition[DEFAULT].start;

      actorDefinition[DEFAULT].start = (messageProps) => {
        if (typeof originalStart === "function") {
          originalStart(messageProps);
        }

        const { id, message, tell } = messageProps;

        tell({
          type: STARTED,
          receiver: message.sender,
          sender: id,
          id: message.id,
        });
      };

      return {
        id,
        handlers: actorDefinition,
        behavior,
        state: {},
        links: [],
      };
    }

    /**
     * Create/Spawn a new actor in the current thread
     * @param message
     */
    public async createActor(message: Message) {
      const handlers = deserialize(message.payload);
      const actor = this.makeActorObject(handlers);

      this.actors[actor.id] = actor;

      this.send({
        type: "start",
        receiver: actor.id,
        sender: message.sender,
        payload: undefined,
        id: message.id,
      });
    }

    /**
     * Deliver message locally or to the worker-pool
     * @param message
     */
    public send(message: Message) {
      if (!message.id) {
        message.id = generateId();
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

    private createMessageProps(actor, message) {
      return {
        // Values
        message,
        id: actor.id,
        context: this.ctx,
        links: actor.links,
        behavior: actor.behavior.current,

        // Methods
        spawn: async (actorDefinition: string) => {
          const payload =
            typeof actorDefinition === "string"
              ? { actorDefinition }
              : { code: serialize(actorDefinition) };

          console.log("spawn payload??", payload);

          return futureMessage(this, {
            type: "spawn",
            receiver: thread.name + ".0",
            sender: actor.id,
            payload,
          });
        },
        tell: (msg: Message) => this.send({ ...msg, sender: actor.id }),
        ask: (msg: Message) =>
          futureMessage(this, {
            ...msg,
            sender: actor.id,
          }),
        reply: (msg: Partial<Message>) => {
          this.send({
            ...msg,
            type: REPLY,
            sender: actor.id,
            receiver: message.sender,
            id: message.id,
          });
        },
        become: () => {},
        unbecome: () => {},
        link: () => {},
        setState: (newState) => {
          actor.state = newState;
        },
        getState: () => actor.state,
      };
    }

    private createThreadMethods(messageProps) {
      Object.setPrototypeOf(messageProps, {
        localSpawn: (msg) => {
          console.log("localSpawn");
          this.createActor(msg);
        },
        info: () => {
          return this.actors;
        },
      });
    }

    /**
     * Consume a message and execute the receiver actor
     * @param message
     */
    private consume(message: Message) {
      const actor = this.actors[message.receiver];
      const behavior = actor.behavior.current;

      if (message.type === REPLY || message.type === STARTED) {
        thread.dispatchEvent(
          new CustomEvent(RESUME + message.id, { detail: message })
        );
      }

      if (message.type in actor.handlers[behavior]) {
        const messageProps = this.createMessageProps(actor, message);

        // TODO: enable this only for thread actors
        if (isThreadActor(actor.id)) {
          this.createThreadMethods(messageProps);
        }

        actor.handlers[behavior][message.type](messageProps);
      } else {
        if (typeof actor.handlers[behavior].unknown === "function") {
          actor.handlers[behavior].otherwise({ test: true });
        }
      }
    }
  }

  /**
   * Check if an actor id is from a thread actor
   */
  function isThreadActor(id) {
    return id.split(".")[1] === "0";
  }

  /**
   * Handle asynchronous messages
   */
  function futureMessage(_this: ActorsNode, msg: Message) {
    return new Promise((resolve) => {
      const msgId = generateId();

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

  /**
   * Generate random ids
   */
  function generateId() {
    return Math.random().toString(32).substring(2, 12);
  }

  /**
   * JSON.stringify with support to functions
   */
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

  /**
   * JSON.parse with support to async functions
   */
  function deserialize(txt) {
    const { config = {}, ...obj } = JSON.parse(txt);
    const AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor;

    for (const prop in obj) {
      obj[prop] = new AsyncFunction("messageProps", obj[prop]);
    }

    return { ...obj, config };
  }

  /**
   * ThreadActor - responsible to manage actors in the current thread
   */
  const threadActor = {
    async thread() {},
    async start() {
      //@ts-ignore
      console.log("thread actor", messageProps);
    },
    async info() {
      //@ts-ignore
      const { info } = messageProps;
      console.log("INFO", info());
    },
    async spawn() {
      //@ts-ignore
      const { message, localSpawn, context, reply } = messageProps;
      console.log("spawn??????", message);
      console.log("context", context);
      if (message.payload.code) {
        console.log("??", message.payload.code);
        localSpawn({ ...message, payload: message.payload.code });
        reply({ payload: "???" });
      }

      if (message.payload.url) {
        console.warn("ERROR: url not supported yet");
        // localSpawn({ ...message, payload: message.payload.code });
      }
    },
  };

  const node = new ActorsNode();

  node.createActor({
    receiver: `${thread.name}.0`,
    type: "SPAWN",
    sender: "0.0",
    payload: serialize(threadActor),
  });
}
