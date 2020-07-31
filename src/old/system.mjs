import { WorkerPool } from "./worker-pool.mjs";
import { SPAWN, SYSTEM } from "./constants.mjs";

function workerCode() {
  console.log("from worker code");
  onmessage = (e) => console.log("msg", e);
}

export function Ortoo(settings) {
  const pool = new WorkerPool(workerCode.toString(), async (e) => {
    /** @type {import("./types").Message} */
    const message = e.data;

    // console.log("main thread receive", message);

    if (message.receiver === SYSTEM) {
      switch (message.type) {
        case SPAWN: {
          pool.postMessage(message);
          break;
        }
      }
    } else {
      const [workerId, ..._] = message.receiver;
      pool.postMessage(message, { workerId });
    }
  });

  if (settings.root) {
    pool.postMessage({
      type: SPAWN,
      sender: SYSTEM,
      payload: { url: settings.root },
    });
  }

  // requestAnimationFrame()

  if (settings.debug) {
    globalThis.Thesis = {
      version: 1,
      getActors: () => this.actors,
      tell: (pid, text) => tell(pid, "repl", "start", text),
    };
  }
}
