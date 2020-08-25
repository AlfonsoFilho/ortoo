import { Message, WorkerState, ActorObject, ThreadActorParams } from "./types";
import { messagingPlugin } from "./plugins/messaging-plugin";
import { behaviorPlugin } from "./plugins/behavior-plugin";
import { linkagePlugin } from "./plugins/linkage-plugin";
import { statePlugin } from "./plugins/state-plugin";
import { consume } from "./worker/consume";
import { send } from "./worker/send";
import { deserialize } from "./utils/deserialize";
import { serialize, removeComments, parseFunction } from "./utils/serialize";
import { futureMessage } from "./utils/future-message";
import { getMaxThreads } from "./utils/max-threads";
import { generateId } from "./utils/generate-id";
import { createActorParams } from "./worker/actor-params";
import { createPrivilegedActorParams } from "./worker/privileged-actor-params";
import { usePlugins } from "./plugins/use-plugins";
import { isMainThreadActor } from "./utils/is-main-thread-actor";
import { parseModule } from "./utils/parse-module";

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
    async start(messageProps: ThreadActorParams) {
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
    async import(msg: ThreadActorParams) {
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
    isMainThreadActor,
    futureMessage,
    consume,
    createPrivilegedActorParams,
    createActorParams,
    createActor,
    send,
    usePlugins,
    messagingPlugin,
    behaviorPlugin,
    linkagePlugin,
    statePlugin,
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
