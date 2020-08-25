import { makeActorObject, bootstrapThread } from "./worker";
import { createPrivilegedActorParams } from "./worker/privileged-actor-params";

export interface Message {
  id?: string;
  sender?: string;
  receiver: string;
  type: string;
  payload?: any;
  meta?: {
    [index: string]: boolean | string | number | undefined | null;
    reply?: boolean;
  };
}

export type ActorObject = ReturnType<typeof makeActorObject>;

// export type ActorParams = ReturnType<typeof createActorParams>;
export type ActorParams = any;

export type ThreadActorParams = ActorParams &
  ReturnType<typeof createPrivilegedActorParams>;

export type BootstrapThread = typeof bootstrapThread;

export interface ThreadOptions {
  [index: string]: string | number | boolean | Settings;
  id: string;
  settings: Settings;
  maxWorkers: number;
  isMainThread: boolean;
}

export interface WorkerState {
  autoIncrement: number;
  actors: Record<string, ActorObject>;
  channel: BroadcastChannel;
  senders: Record<string, MessagePort>;
  options: {
    [index: string]: any;
    root: string;
  };
  deadLetters: Message[];
  maxWorkers: number;
  workerId: string;
  plugins?: {};
}

export interface Settings {
  root?: any;
  debug?: boolean;
  plugins?: Array<(...args: any[]) => void>;
}
