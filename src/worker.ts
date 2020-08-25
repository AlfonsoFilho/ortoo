import {
  Message,
  WorkerState,
  ActorObject,
  ThreadActorParams,
  MainThreadActorParams,
} from "./types";
import {
  getMaxThreads,
  generateId,
  deserialize,
  serialize,
  removeComments,
  parseFunction,
} from "./utils";

const STARTED = "STARTED";
const DEFAULT = "DEFAULT";
const RESUME = "RESUME";
const REPLY = "REPLY";

/**
 * tested: no
 * status: ready
 * pending:
 *  - clean comments
 *  - use getThreadId
 */
export function send(message: Message, ws: WorkerState) {
  if (!message.id) {
    message.id = generateId();
  }
  const threadId = message.receiver.split(".")[0];
  // console.log("message", message, ws);

  if (threadId === ws.workerId) {
    // when the actor is in the same thread
    consume(message, ws);
  } else if (Object.keys(ws.senders).includes(threadId)) {
    // when the actor is in another thread
    ws.senders[threadId].postMessage(message);
  } else if (threadId === "*") {
    // when message should be broadcasted to all threads
    ws.channel.postMessage(message);
  }
}

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
  if (!(DEFAULT in actorDefinition)) {
    actorDefinition = {
      [DEFAULT]: actorDefinition,
    };
  }

  const id = `${ws.workerId}.${ws.autoIncrement++}`;

  const behavior = {
    _history: [] as string[],
    _current: actorDefinition.config ?? DEFAULT,
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
        type: STARTED,
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

function isThreadActor(id: string) {
  return id.split(".")[1] === "0";
}

function isMainThreadActor(id: string) {
  return id === "0.0";
}

export function getSpawnWorker(ws: WorkerState): string {
  // TODO: replace this
  return String(Math.floor(Math.random() * Math.floor(ws.maxWorkers))) + ".0";
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

export function createActorParams(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    // Values
    message,
    id: actor.id,
    context: ws,
    links: actor.links,
    behavior: actor.behavior._current,

    // Methods
    async spawn(actorDefinition: string) {
      // TODO: fix typing
      const payload =
        typeof actorDefinition === "string"
          ? { url: actorDefinition }
          : { code: serialize(actorDefinition) };

      const msg = {
        type: "spawn",
        receiver: getSpawnWorker(ws),
        sender: actor.id,
        payload,
      };

      const resp = await futureMessage(msg, ws);

      return resp.sender;
    },
    tell(msg: Message) {
      send({ ...msg, sender: actor.id }, ws);
    },
    ask(msg: Exclude<Message, "sender">) {
      return futureMessage(
        {
          ...msg,
          sender: actor.id,
        },
        ws
      );
    },
    reply(msg: Partial<Message>) {
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
    become: (behavior: string) => {
      const BEHAVIOR_HISTORY_LIMIT = 20;
      if (actor.behavior._history.length <= BEHAVIOR_HISTORY_LIMIT) {
        actor.behavior._history.push(actor.behavior._current);
      } else {
        const [_, ...history] = actor.behavior._history;
        actor.behavior._history = [...history, actor.behavior._current];
      }

      actor.behavior._current = behavior;
    },
    unbecome: () => {
      if (actor.behavior._history.length > 0) {
        actor.behavior._current = actor.behavior._history.pop() ?? DEFAULT;
      } else {
        actor.behavior._current = DEFAULT;
        // actor.behavior.current = actor.behavior.default;
      }
    },
    link: async (id: string) => {
      const resp = await futureMessage(
        {
          type: "link",
          receiver: id,
          sender: actor.id,
        },
        ws
      );
      actor.links.push(id);
      return true;
    },
    unlink: async (id: string) => {
      const resp = await futureMessage(
        {
          type: "link",
          receiver: id,
          sender: actor.id,
        },
        ws
      );
      actor.links = actor.links.filter((it) => it !== id);
      return true;
    },
    broadcast: (msg: Message) => {
      send(
        {
          ...msg,
          receiver: "*",
        },
        ws
      );
    },
    setState(newState) {
      actor.state = newState;
    },
    getState: () => actor.state,
    async info(id) {
      const resp = await futureMessage(
        {
          type: "info",
          receiver: id,
          sender: actor.id,
        },
        ws
      );

      return resp.payload;
    },
  };
}

export function createPrivilegedActorParams(
  actor: ActorObject,
  message: Message,
  ws: WorkerState
) {
  return {
    ...createActorParams(actor, message, ws),
    localSpawn: (msg) => {
      createActor(msg, ws);
    },
    info: () => ws.actors,
    parseModule,
    serialize,
    deserialize,
    getWorkerState: () => ws,
    isMainThread: () => isMainThreadActor(actor.id),
    importModule: (url: string) => {
      if (!isMainThreadActor(actor.id)) {
        throw new Error("importModule must be executed in the main thread");
      }
      return import(url).then((mod) => mod.default);
    },
  };
}

// function usePlugins(
//   actor: ActorObject,
//   message: Message,
//   ws: WorkerState,
//   plugins: Function[]
// ) {
//   return plugins.reduce((acc, plugin) => {
//     return { ...acc, ...plugin(actor, message, ws) };
//   }, {});
// }

// function builtInSpawn(actor: ActorObject, message: Message, ws: WorkerState) {
//   return {
//     async spawn(actorDef: string) {},
//     tell(msg: Message) {
//       send({ ...msg, sender: actor.id }, ws);
//     },
//   };
// }

function consume(message: Message, ws: WorkerState) {
  const actor = ws.actors[message.receiver];
  const behavior = actor.behavior._current;

  if (message.type === REPLY || message.type === STARTED) {
    self.dispatchEvent(
      new CustomEvent(RESUME + message.id, { detail: message })
    );
  }

  if (message.type in actor.handlers[behavior]) {
    const actorParams = isThreadActor(actor.id)
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

export function isMessage(msg: Partial<Message> = {}): boolean {
  const hasType = typeof msg.type === "string";
  const hasReceiver = typeof msg.receiver === "string";
  return hasType && hasReceiver;
}

export function isAddressedToCurrentThread(msg: Message, ws: WorkerState) {
  const threadId = msg.receiver.split(".")[0];
  return threadId === ws.workerId;
}

function startThreadActor(ws: WorkerState) {
  /**
   * ThreadActor - responsible to manage actors in the current thread
   */
  const threadActor = {
    async ping(ortoo: ThreadActorParams) {
      const { message } = ortoo;
      console.log("PING", message);
    },
    async start(messageProps: MainThreadActorParams) {
      const {
        getWorkerState,
        isMainThread,
        importModule,
        localSpawn,
        serialize,
      } = messageProps;
      const ws = getWorkerState();
      if (isMainThread()) {
        const code = await importModule(ws.options.root);
        localSpawn({ payload: serialize(code) });
      }
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
      reply({ payload: serialize(code) });
    },
    async spawn(messageProps: ThreadActorParams) {
      const { message, localSpawn, reply, ask, id } = messageProps;

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

  createActor(
    {
      receiver: `${ws.workerId}.0`,
      type: "SPAWN",
      payload: serialize(threadActor),
    },
    ws
  );
}

export function bootstrapThread(thread: any = self, options) {
  const receivers = {};
  const senders = {};
  const channel = new BroadcastChannel("__ortoo:channel__");
  const workerState: WorkerState = {
    autoIncrement: 0,
    actors: {},
    channel,
    senders,
    options,
    deadLetters: [],
    workerId: thread.name,
    maxWorkers: getMaxThreads(),
  };

  // Broadcast handler
  channel.onmessage = ({ data }) => {
    console.log(`worker ${thread.name} received broadcasted message: `, data);
    consume(data, workerState);
  };

  // Worker PostMessage handler
  thread.onmessage = (e: MessageEvent) => {
    if (e.data.receiver_port) {
      receivers[e.data.worker] = e.data.receiver_port;
      receivers[e.data.worker].onmessage = (e: MessageEvent) => {
        send(e.data, workerState);
      };
    }

    if (e.data.sender_port) {
      senders[e.data.worker] = e.data.sender_port;
    }
  };

  startThreadActor(workerState);
}

export function createWorker(
  bootstrap: Function,
  threadId: number,
  options = {}
) {
  const bootstrapDeps = [
    generateId,
    removeComments,
    parseFunction,
    parseModule,
    serialize,
    deserialize,
    getMaxThreads,
    isThreadActor,
    isMainThreadActor,
    futureMessage,
    consume,
    createPrivilegedActorParams,
    createActorParams,
    createActor,
    send,
    bootstrap,
  ].map((it) => it.toString());

  const code = URL.createObjectURL(
    new Blob([
      ...bootstrapDeps,
      `;${bootstrap.name}(self, ${JSON.stringify(options)})`,
    ])
  );
  return new Worker(code, { name: String(threadId) });
}
