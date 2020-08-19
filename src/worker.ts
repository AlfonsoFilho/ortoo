import { Message } from "./types";

export function worker(thread = self, context) {
  const STARTED = "STARTED";
  const DEFAULT = "DEFAULT";
  const RESUME = "RESUME";
  const REPLY = "REPLY";

  class ActorsNode {
    private autoIncrement = 0;
    private actors = {};
    private ctx = {
      ...context,
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

    private getSpawnWorker() {
      return (
        String(
          Math.floor(Math.random() * Math.floor(this.ctx.maxWorkers)) + 1
        ) + ".0"
      );
    }

    private createMessageProps(actor, message: Message) {
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
              ? { url: actorDefinition }
              : { code: serialize(actorDefinition) };

          console.log("spawn payload??", payload);
          const resp = await futureMessage(this, {
            type: "spawn",
            receiver: this.getSpawnWorker(),
            sender: actor.id,
            payload,
          });

          return resp.sender;
        },
        tell: (msg: Message) => this.send({ ...msg, sender: actor.id }),
        ask: (msg: Exclude<Message, "sender">) =>
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

    private createThreadMethods(actor, message) {
      return {
        ...this.createMessageProps(actor, message),
        localSpawn: (msg) => {
          this.createActor(msg);
        },
        info: () => {
          return this.actors;
        },
        parseModule,
        serialize,
        deserialize,
      };
    }

    private createMainThreadMethods(actor, message) {
      return {
        ...this.createThreadMethods(actor, message),
        importModule: (url: string) => {
          return import(url).then((mod) => mod.default);
        },
      };
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
        const messageProps = isThreadActor(actor.id)
          ? isMainThreadActor(actor.id)
            ? this.createMainThreadMethods(actor, message)
            : this.createThreadMethods(actor, message)
          : this.createMessageProps(actor, message);

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

  function isMainThreadActor(id) {
    return id === "0.0";
  }

  /**
   * Handle asynchronous messages
   */
  function futureMessage(_this: ActorsNode, msg: Message): Promise<Message> {
    return new Promise((resolve) => {
      const msgId = generateId();

      thread.addEventListener(
        RESUME + msgId,
        (e) => {
          resolve(e.detail);
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

  function parseFunction(code) {
    return {
      body: code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim(),
      paramName: code.match(/\w+\s(\w+)\(([a-z0-9]*)\)/)[2].trim(),
    };
  }

  function removeComments(code) {
    return code.replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "");
  }

  /**
   * JSON.stringify with support to functions
   */
  function serialize(localMod) {
    return JSON.stringify(localMod, (k, v) => {
      if (typeof v === "function") {
        const code = v.toString();
        return parseFunction(removeComments(code));
      }
      return v;
    });
  }

  /**
   * JSON.parse with support to async functions
   */
  function deserialize(txt) {
    // console.log("deserialize:xt", txt);
    const { config = {}, ...obj } = JSON.parse(txt);
    // console.log("deserialize:obj", obj);
    const AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor;
    for (const prop in obj) {
      const { body, paramName } = obj[prop];
      obj[prop] = new AsyncFunction(paramName, body);
    }

    return { ...obj, config };
  }

  type ActorParams = ReturnType<ActorsNode["createMessageProps"]>;

  type ThreadActorParams = ActorParams &
    ReturnType<ActorsNode["createThreadMethods"]>;

  type MainThreadActorParams = ThreadActorParams &
    ReturnType<ActorsNode["createMainThreadMethods"]>;

  function parseModule(code) {
    code = removeComments(code);
    code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim();

    // console.log("CODE", code);
    // console.log("CODE", serialize(code));
    return deserialize(serialize(`{${code}}`));
  }

  /**
   * ThreadActor - responsible to manage actors in the current thread
   */
  const threadActor = {
    async thread() {},
    async start(messageProps: ThreadActorParams) {
      // const { setState } = messageProps; // from ortoo
      // setState({
      //   lastWorkerId: 0,
      // });
      // console.log("thread actor", messageProps);
    },
    async info(messageProps: ThreadActorParams) {
      const { info } = messageProps;
      console.log("INFO", info());
    },
    async import(msg: MainThreadActorParams) {
      const { importModule, message, reply, serialize } = msg;
      const code = await importModule(message.payload);
      console.log("IMPORTing", message);
      console.log("IMPORTED", code);
      reply({ payload: serialize(code) });
    },
    async spawn(messageProps: ThreadActorParams) {
      const {
        message,
        localSpawn,
        parseModule,
        context,
        reply,
        ask,
        id,
        deserialize,
      } = messageProps;
      if (message.payload.code) {
        localSpawn({ ...message, payload: message.payload.code });
        reply({ payload: "???" });
      }

      if (message.payload.url) {
        const resp = await ask({
          receiver: "0.0",
          payload: message.payload.url,
          type: "import",
          sender: id,
        });
        localSpawn({ ...message, payload: resp.payload });
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
