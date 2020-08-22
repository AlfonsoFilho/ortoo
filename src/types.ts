import { createWorkerPool } from "./worker-pool";
import {
  makeActorObject,
  createMessageProps,
  createThreadMethods,
  createMainThreadMethods,
  bootstrapWorker,
} from "./worker";

export interface Message {
  id?: string;
  sender?: string;
  receiver: string;
  type: string;
  payload?: any;
}

export type ActorObject = ReturnType<typeof makeActorObject>;

export type ActorParams = ReturnType<typeof createMessageProps>;

export type ThreadActorParams = ActorParams &
  ReturnType<typeof createThreadMethods>;

export type MainThreadActorParams = ThreadActorParams &
  ReturnType<typeof createMainThreadMethods>;

export type BootstrapThread = typeof bootstrapWorker;
export interface ThreadOptions {
  [index: string]: string | number | boolean | IThread;
  id: string;
  thread: IThread;
  maxWorkers: number;
  isMainThread: boolean;
}

export abstract class IThread {
  constructor(
    bootstrap: typeof bootstrapWorker,
    options: Record<string, any>
  ) {}
  abstract postMessage(msg: Message): void;
  abstract onMessage(callback: (msg: Message) => void): void;
}

export interface WorkerState {
  autoIncrement: number;
  actors: Record<string, ActorObject>;
  channel: BroadcastChannel;
  context: {
    maxWorkers: number;
    workerId: string;
  };
}

export interface Settings {
  root?: any;
  debug?: boolean;
  plugins?: Array<(pool: WorkerPool, channel: BroadcastChannel) => void>;
}

export type WorkerPool = ReturnType<typeof createWorkerPool>;

export interface WorkerPoolPostMessageOptions {
  workerId?: string;
}
