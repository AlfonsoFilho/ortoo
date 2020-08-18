import { createWorkerPool } from "./worker-pool";

export interface Message {
  id?: string;
  sender: string;
  receiver: string;
  type: string;
  payload?: any;
}

export interface Settings {
  root?: any;
  debug?: boolean;
  middleware?: Array<(pool: WorkerPool) => void>;
}

export type WorkerPool = ReturnType<typeof createWorkerPool>;

export interface WorkerPoolPostMessageOptions {
  workerId?: string;
}
