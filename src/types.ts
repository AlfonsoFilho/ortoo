import { createWorkerPool } from "./worker-pool";

export interface Message {
  id?: string;
  sender: string;
  receiver: string;
  type: string | number;
  payload?: any;
}

export interface Settings {
  root?: any;
  debug?: boolean;
}

// export interface IWorkerPool {
//   maxWorkers: number;
//   currentWorker: number;
//   workerList: Record<string, InlineWorker>;
//   postMessage?: (message: Message, options: PostMessageOptions) => void;
// }

export type WorkerPool = ReturnType<typeof createWorkerPool>;

export type Broker = (msg: Message, workerPool: WorkerPool) => void;
export interface WorkerPoolPostMessageOptions {
  workerId?: string;
}
