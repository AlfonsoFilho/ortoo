import { IThread, Settings } from "./types";
import { getMaxThreads } from "./utils";
import { createMainThread } from "./main-thread";
import { createWorkerThread } from "./worker-thread";

export function createWorkerPool(settings: Settings) {
  const maxWorkers = getMaxThreads() - 1;
  const workerList: Record<string, void | Worker> = {};

  // Create a worker instance for each thread
  for (let i = 0; i <= maxWorkers; i++) {
    const id = String(i);
    workerList[id] =
      id === "0"
        ? createMainThread({
            id,
            isMainThread: true,
            maxWorkers,
            settings,
          })
        : createWorkerThread({
            id,
            isMainThread: false,
            maxWorkers,
            settings,
          });
  }

  console.log("workerList??", workerList);

  return {
    workerList,
    postMessage,
  };
}
