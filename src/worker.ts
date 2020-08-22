import {
  Message,
  WorkerState,
  ActorObject,
  ThreadActorParams,
  MainThreadActorParams,
  ThreadOptions,
} from "./types";
import { getMaxThreads } from "./utils";

const STARTED = "STARTED";
const DEFAULT = "DEFAULT";
const RESUME = "RESUME";
const REPLY = "REPLY";

export function send(message: Message, ws: WorkerState) {
  if (!message.id) {
    message.id = generateId();
  }
  if (message.receiver[0] === ws.context.workerId) {
    consume(message, ws);
  } else {
    ws.channel.postMessage(message);
  }
}

export function makeActorObject(actorDefinition, ws: WorkerState) {
  if (!(DEFAULT in actorDefinition)) {
    actorDefinition = {
      [DEFAULT]: actorDefinition,
    };
  }

  const id = `${ws.context.workerId}.${ws.autoIncrement++}`;

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
  // const originalInfo = actorDefinition[DEFAULT].info;
  debugger;
  actorDefinition[DEFAULT].start = (messageProps: ThreadActorParams) => {
    if (typeof originalStart === "function") {
      originalStart(messageProps);
    }

    const { id, message, tell } = messageProps;
    if (message.sender) {
      tell({
        type: STARTED,
        receiver: message.sender,
        sender: id,
        id: message.id,
      });
    }
  };

  actorDefinition[DEFAULT].link = ({ links, sender, reply }) => {
    links.push(sender);
    reply({});
  };

  // actorDefinition[DEFAULT].info = (msg) => {
  //   const { reply, id, state, behavior } = msg;
  //   console.log("INF??", originalInfo);
  //   if (typeof originalInfo === "function") {
  //     originalInfo(msg);
  //   }
  //   reply({ payload: { id, state, behavior } });
  // };

  return {
    id,
    handlers: actorDefinition,
    behavior,
    state: {},
    links: [] as string[],
  };
}

function isThreadActor(id: string) {
  return id.split(".")[1] === "0";
}

function isMainThreadActor(id: string) {
  return id === "0.0";
}

/**
 * JSON.stringify with support to functions
 */
export function serialize(localMod: object) {
  return JSON.stringify(localMod, (k, v) => {
    if (typeof v === "function") {
      return parseFunction(removeComments(v.toString()));
    }
    return v;
  });
}

/**
 * JSON.parse with support to async functions
 */
export function deserialize(txt: string) {
  const { config = {}, ...obj } = JSON.parse(txt);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const prop in obj) {
    const { body, paramName } = obj[prop];
    obj[prop] = new AsyncFunction(paramName, body);
  }

  return { ...obj, config };
}

export function getSpawnWorker(ws: WorkerState): string {
  return (
    String(Math.floor(Math.random() * Math.floor(ws.context.maxWorkers)) + 1) +
    ".0"
  );
}

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

export function createMessageProps(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    // Values
    message,
    id: actor.id,
    context: ws.context,
    links: actor.links,
    behavior: actor.behavior.current,

    // Methods
    spawn: async (actorDefinition: string) => {
      const payload =
        typeof actorDefinition === "string"
          ? { url: actorDefinition }
          : { code: serialize(actorDefinition) };

      const resp = await futureMessage(
        {
          type: "spawn",
          receiver: getSpawnWorker(ws),
          sender: actor.id,
          payload,
        },
        ws
      );

      return resp.sender;
    },
    tell: (msg: Message) => {
      send({ ...msg, sender: actor.id }, ws);
    },
    ask: (msg: Exclude<Message, "sender">) => {
      console.log("ask?", msg);
      return futureMessage(
        {
          ...msg,
          sender: actor.id,
        },
        ws
      );
    },
    reply: (msg: Partial<Message>) => {
      if (message.sender) {
        send(
          {
            ...msg,
            type: REPLY,
            sender: actor.id,
            receiver: message.sender,
            id: message.id,
          },
          ws
        );
      }
    },
    become: () => {},
    unbecome: () => {},
    link: async (id: string) => {
      actor.links.push(id);
    },
    setState: (newState) => {
      actor.state = newState;
    },
    getState: () => actor.state,
    info: async (id) => {
      // console.log("info ??", id);
      const resp = await futureMessage(
        {
          type: "info",
          receiver: id,
          sender: actor.id,
        },
        ws
      );

      console.log("resp ingo", resp);

      return resp.payload;
    },
  };
}

export function createThreadMethods(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    ...createMessageProps(actor, message, ws),
    localSpawn: (msg) => {
      createActor(msg, ws);
    },
    info: () => {
      // console.log("info ????????", { ...ws });
      return ws.actors;
    },
    parseModule,
    serialize,
    deserialize,
  };
}

export function createMainThreadMethods(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    ...createThreadMethods(actor, message, ws),
    importModule: (url: string) => {
      return import(url).then((mod) => mod.default);
    },
  };
}

function consume(message: Message, ws: WorkerState) {
  const actor = ws.actors[message.receiver];
  const behavior = actor.behavior.current;

  if (message.type === REPLY || message.type === STARTED) {
    self.dispatchEvent(
      new CustomEvent(RESUME + message.id, { detail: message })
    );
  }

  if (message.type in actor.handlers[behavior]) {
    const messageProps = isThreadActor(actor.id)
      ? isMainThreadActor(actor.id)
        ? createMainThreadMethods(actor, message, ws)
        : createThreadMethods(actor, message, ws)
      : createMessageProps(actor, message, ws);

    actor.handlers[behavior][message.type](messageProps);
  } else {
    if (typeof actor.handlers[behavior].otherwise === "function") {
      actor.handlers[behavior].otherwise({ test: true });
    }
  }
}

export function futureMessage(msg: Message, ws: WorkerState): Promise<Message> {
  return new Promise((resolve) => {
    const msgId = generateId();

    self.addEventListener(
      RESUME + msgId,
      (e) => {
        resolve(e.detail);
      },
      { once: true }
    );

    send(
      {
        ...msg,
        id: msgId,
      },
      ws
    );
  });
}

export function parseModule(code) {
  code = removeComments(code);
  code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim();

  return deserialize(`{${code}}`);
}

export function parseFunction(code) {
  return {
    body: code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim(),
    paramName: code.match(/\w+\s(\w+)\(([a-z0-9]*)\)/)[2].trim(),
  };
}

export function removeComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "");
}

export function generateId() {
  return Math.random().toString(32).substring(2, 12);
}

export function isMessage(msg: Partial<Message> = {}): boolean {
  const hasType = typeof msg.type === "string";
  const hasReceiver = typeof msg.receiver === "string";
  return hasType && hasReceiver;
}

export function isAddressedToCurrentThread(msg: Message, ws: WorkerState) {
  const threadId = msg.receiver.split(".")[0];
  return threadId === ws.context.workerId;
}

/**
 * Worker start here
 */
export function bootstrapWorker(options: ThreadOptions) {
  const workerState: WorkerState = {
    autoIncrement: 0,
    actors: {},
    channel: new BroadcastChannel("ortoo:channel"),
    context: {
      workerId: !!self.name ? self.name : "0",
      maxWorkers: getMaxThreads(),
      settings: options.settings,
    },
  };

  // console.log("Bootstrap Worker!", workerState.context);

  workerState.channel.onmessage = ({ data }) => {
    console.log(
      "MSG?",
      data,
      workerState,
      isMessage(data) && isAddressedToCurrentThread(data, workerState)
    );
    if (isMessage(data) && isAddressedToCurrentThread(data, workerState)) {
      send(data, workerState);
    }
  };

  /**
   * ThreadActor - responsible to manage actors in the current thread
   */
  const threadActor = {
    async thread() {},
    async start(messageProps: ThreadActorParams) {
      const { id } = messageProps;
      console.log("start from actor ???", id);
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
      const { message, localSpawn, reply, ask, id } = messageProps;
      console.log("spawn????????", message, id);
      if (message.payload.code) {
        localSpawn({ ...message, payload: message.payload.code });
        reply({ payload: "???" });
      }

      if (message.payload.url) {
        console.log("IS YRL");
        const resp = await ask({
          receiver: "0.0",
          payload: message.payload.url,
          type: "import",
          sender: id,
        });
        console.log("resp spawn???", resp);
        localSpawn({ ...message, payload: resp.payload });
      }
    },
  };

  createActor(
    {
      receiver: `${workerState.context.workerId}.0`,
      type: "SPAWN",
      payload: serialize(threadActor),
    },
    workerState
  );

  send(
    {
      type: "spawn",
      receiver: "1.0",
      payload: { url: options.settings.root },
    },
    workerState
  );
}

// --------------------------------------------------------------------

// export function worker(thread = self, context) {
//   const STARTED = "STARTED";
//   const DEFAULT = "DEFAULT";
//   const RESUME = "RESUME";
//   const REPLY = "REPLY";

//   class ActorsNode {
//     private autoIncrement = 0;
//     private actors = {};
//     private ctx = {
//       ...context,
//       id: thread.name,
//     };

//     constructor() {
//       thread.onmessage = ({ data }) => node.send(data);
//     }

//     /**
//      * Get an actor definition and return a concrete actor object
//      * @param actorDefinition
//      */
//     private makeActorObject(actorDefinition) {
//       if (!(DEFAULT in actorDefinition)) {
//         actorDefinition = {
//           [DEFAULT]: actorDefinition,
//         };
//       }

//       const id = `${thread.name}.${this.autoIncrement++}`;

//       const behavior = {
//         history: [],
//         current: DEFAULT,
//         // default: settings.behavior.default,
//       };

//       // Object.setPrototypeOf(handlers[DEFAULT], {
//       //   start(...a) {
//       //     console.log("start default handler ", id, a);
//       //   },
//       //   stop() {
//       //     console.log("stop default handler ", id);
//       //   },
//       // });

//       const originalStart = actorDefinition[DEFAULT].start;

//       actorDefinition[DEFAULT].start = (messageProps) => {
//         if (typeof originalStart === "function") {
//           originalStart(messageProps);
//         }

//         const { id, message, tell } = messageProps;

//         tell({
//           type: STARTED,
//           receiver: message.sender,
//           sender: id,
//           id: message.id,
//         });
//       };

//       actorDefinition[DEFAULT].link = ({ links, sender, reply }) => {
//         links.push(sender);
//         reply({});
//       };

//       actorDefinition[DEFAULT].info = ({ reply, id, state, behavior }) => {
//         reply({ payload: { id, state, behavior } });
//       };

//       return {
//         id,
//         handlers: actorDefinition,
//         behavior,
//         state: {},
//         links: [],
//       };
//     }

//     /**
//      * Create/Spawn a new actor in the current thread
//      * @param message
//      */
//     public async createActor(message: Message) {
//       const handlers = deserialize(message.payload);
//       const actor = this.makeActorObject(handlers);

//       this.actors[actor.id] = actor;

//       this.send({
//         type: "start",
//         receiver: actor.id,
//         sender: message.sender,
//         payload: undefined,
//         id: message.id,
//       });
//     }

//     /**
//      * Deliver message locally or to the worker-pool
//      * @param message
//      */
//     public send(message: Message) {
//       if (!message.id) {
//         message.id = generateId();
//       }

//       if (!message.receiver) {
//         throw new Error("Receiver missing");
//       }

//       if (message.receiver[0] === thread.name) {
//         this.consume(message);
//       } else {
//         thread.postMessage(message);
//       }
//     }

//     private getSpawnWorker() {
//       return (
//         String(
//           Math.floor(Math.random() * Math.floor(this.ctx.maxWorkers)) + 1
//         ) + ".0"
//       );
//     }

//     private createMessageProps(actor, message: Message) {
//       return {
//         // Values
//         message,
//         id: actor.id,
//         context: this.ctx,
//         links: actor.links,
//         behavior: actor.behavior.current,

//         // Methods
//         spawn: async (actorDefinition: string) => {
//           const payload =
//             typeof actorDefinition === "string"
//               ? { url: actorDefinition }
//               : { code: serialize(actorDefinition) };

//           console.log("spawn payload??", payload);
//           const resp = await futureMessage(this, {
//             type: "spawn",
//             receiver: this.getSpawnWorker(),
//             sender: actor.id,
//             payload,
//           });

//           return resp.sender;
//         },
//         tell: (msg: Message) => this.send({ ...msg, sender: actor.id }),
//         ask: (msg: Exclude<Message, "sender">) =>
//           futureMessage(this, {
//             ...msg,
//             sender: actor.id,
//           }),
//         reply: (msg: Partial<Message>) => {
//           this.send({
//             ...msg,
//             type: REPLY,
//             sender: actor.id,
//             receiver: message.sender,
//             id: message.id,
//           });
//         },
//         become: () => {},
//         unbecome: () => {},
//         link: async (id: string) => {
//           const resp = await futureMessage(this, {
//             type: "link",
//             receiver: id,
//             sender: actor.id,
//             payload: null,
//           });

//           actor.links.push(id);
//         },
//         setState: (newState) => {
//           actor.state = newState;
//         },
//         getState: () => actor.state,
//         info: async (id) => {
//           const resp = await futureMessage(this, {
//             type: "info",
//             receiver: id,
//             sender: actor.id,
//           });

//           return resp.payload;
//         },
//       };
//     }

//     private createThreadMethods(actor, message) {
//       return {
//         ...this.createMessageProps(actor, message),
//         localSpawn: (msg) => {
//           this.createActor(msg);
//         },
//         info: () => {
//           return this.actors;
//         },
//         parseModule,
//         serialize,
//         deserialize,
//       };
//     }

//     private createMainThreadMethods(actor, message) {
//       return {
//         ...this.createThreadMethods(actor, message),
//         importModule: (url: string) => {
//           return import(url).then((mod) => mod.default);
//         },
//       };
//     }

//     /**
//      * Consume a message and execute the receiver actor
//      * @param message
//      */
//     private consume(message: Message) {
//       const actor = this.actors[message.receiver];
//       const behavior = actor.behavior.current;

//       if (message.type === REPLY || message.type === STARTED) {
//         thread.dispatchEvent(
//           new CustomEvent(RESUME + message.id, { detail: message })
//         );
//       }

//       if (message.type in actor.handlers[behavior]) {
//         const messageProps = isThreadActor(actor.id)
//           ? isMainThreadActor(actor.id)
//             ? this.createMainThreadMethods(actor, message)
//             : this.createThreadMethods(actor, message)
//           : this.createMessageProps(actor, message);

//         actor.handlers[behavior][message.type](messageProps);
//       } else {
//         if (typeof actor.handlers[behavior].otherwise === "function") {
//           actor.handlers[behavior].otherwise({ test: true });
//         }
//       }
//     }
//   }

//   /**
//    * Check if an actor id is from a thread actor
//    */
//   function isThreadActor(id) {
//     return id.split(".")[1] === "0";
//   }

//   function isMainThreadActor(id) {
//     return id === "0.0";
//   }

//   /**
//    * Handle asynchronous messages
//    */
//   function futureMessage(_this: ActorsNode, msg: Message): Promise<Message> {
//     return new Promise((resolve) => {
//       const msgId = generateId();

//       thread.addEventListener(
//         RESUME + msgId,
//         (e) => {
//           resolve(e.detail);
//         },
//         { once: true }
//       );

//       _this.send({
//         ...msg,
//         id: msgId,
//       });
//     });
//   }

//   /**
//    * Generate random ids
//    */
//   function generateId() {
//     return Math.random().toString(32).substring(2, 12);
//   }

// function parseFunction(code) {
//     return {
//       body: code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim(),
//       paramName: code.match(/\w+\s(\w+)\(([a-z0-9]*)\)/)[2].trim(),
//     };
//   }

//   function removeComments(code) {
//     return code.replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "");
//   }

//   /**
//    * JSON.stringify with support to functions
//    */
//   function serialize(localMod) {
//     return JSON.stringify(localMod, (k, v) => {
//       if (typeof v === "function") {
// const code = v.toString();
// return parseFunction(removeComments(code));
//       }
//       return v;
//     });
//   }

//   /**
//    * JSON.parse with support to async functions
//    */
//   function deserialize(txt) {
//     // console.log("deserialize:xt", txt);
//     const { config = {}, ...obj } = JSON.parse(txt);
//     // console.log("deserialize:obj", obj);
//     const AsyncFunction = Object.getPrototypeOf(async function () {})
//       .constructor;
//     for (const prop in obj) {
//       const { body, paramName } = obj[prop];
//       obj[prop] = new AsyncFunction(paramName, body);
//     }

//     return { ...obj, config };
//   }

//   type ActorParams = ReturnType<ActorsNode["createMessageProps"]>;

//   type ThreadActorParams = ActorParams &
//     ReturnType<ActorsNode["createThreadMethods"]>;

//   type MainThreadActorParams = ThreadActorParams &
//     ReturnType<ActorsNode["createMainThreadMethods"]>;

//   function parseModule(code) {
//     code = removeComments(code);
//     code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim();

//     // console.log("CODE", code);
//     // console.log("CODE", serialize(code));
//     return deserialize(serialize(`{${code}}`));
//   }

//   /**
//    * ThreadActor - responsible to manage actors in the current thread
//    */
//   const threadActor = {
//     async thread() {},
//     async start(messageProps: ThreadActorParams) {
//       // const { setState } = messageProps; // from ortoo
//       // setState({
//       //   lastWorkerId: 0,
//       // });
//       // console.log("thread actor", messageProps);
//     },
//     async info(messageProps: ThreadActorParams) {
//       const { info } = messageProps;
//       console.log("INFO", info());
//     },
//     async import(msg: MainThreadActorParams) {
//       const { importModule, message, reply, serialize } = msg;
//       const code = await importModule(message.payload);
//       console.log("IMPORTing", message);
//       console.log("IMPORTED", code);
//       reply({ payload: serialize(code) });
//     },
//     async spawn(messageProps: ThreadActorParams) {
//       const {
//         message,
//         localSpawn,
//         parseModule,
//         context,
//         reply,
//         ask,
//         id,
//         deserialize,
//       } = messageProps;
//       if (message.payload.code) {
//         localSpawn({ ...message, payload: message.payload.code });
//         reply({ payload: "???" });
//       }

//       if (message.payload.url) {
//         const resp = await ask({
//           receiver: "0.0",
//           payload: message.payload.url,
//           type: "import",
//           sender: id,
//         });
//         localSpawn({ ...message, payload: resp.payload });
//       }
//     },
//   };

//   const node = new ActorsNode();

//   node.createActor({
//     receiver: `${thread.name}.0`,
//     type: "SPAWN",
//     sender: "0.0",
//     payload: serialize(threadActor),
//   });
// }
