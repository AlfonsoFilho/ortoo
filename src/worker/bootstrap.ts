import { WorkerState, ThreadActorParams } from "../types";
import { messagingPlugin } from "../plugins/messaging-plugin";
import { behaviorPlugin } from "../plugins/behavior-plugin";
import { linkagePlugin } from "../plugins/linkage-plugin";
import { statePlugin } from "../plugins/state-plugin";
import { consume } from "./consume";
import { send } from "./send";
import { deserialize } from "../utils/deserialize";
import { serialize, removeComments, parseFunction } from "../utils/serialize";
import { futureMessage } from "../utils/future-message";
import { getMaxThreads } from "../utils/max-threads";
import { generateId } from "../utils/generate-id";
import { createActorParams } from "./actor-params";
import { createPrivilegedActorParams } from "./privileged-actor-params";
import { usePlugins } from "../plugins/use-plugins";
import { isMainThreadActor } from "../utils/is-main-thread-actor";
import { parseModule } from "../utils/parse-module";
import { createActor } from "./create-actor";

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
