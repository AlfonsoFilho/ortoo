import { SPAWN } from "./constants.mjs";
import { CONTEXT_SET } from "./constants.mjs";
import { SYSTEM } from "./constants.mjs";

function WorkerPool(url, onMessage) {
  const { href } = new URL(url, location.origin);
  this.maxWorkers = navigator.hardwareConcurrency;
  this.currentWorker = 0;
  this.workerList = [];
  /**
   * @param message {import("./types").Message}
   * @param options {object}
   */
  this.postMessage = (message, options = {}) => {
    if (options.workerId) {
      this.workerList[options.workerId].instance.postMessage(message);
    } else {
      this.workerList[this.currentWorker].instance.postMessage(message);
      this.currentWorker = this.currentWorker < this.maxWorkers
        ? this.currentWorker + 1
        : 0;
    }
  };

  for (let i = 0; i <= this.maxWorkers; i++) {
    this.workerList[i] = {
      id: String(i),
      instance: new Worker(href, { name: i, type: "module" }),
    };
    this.workerList[i].instance.onmessage = onMessage;
  }

  for (let i = 0; i <= this.maxWorkers; i++) {
    const message = {
      type: CONTEXT_SET,
      payload: {
        currentWorker: i,
        workers: this.workerList.map(({ id }) => id),
      },
    };
    this.workerList[i].instance.postMessage(message);
  }
}

function ActorSystem(settings) {
  const pool = new WorkerPool("./worker.mjs", async (e) => {
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
    pool.postMessage(
      { type: SPAWN, sender: SYSTEM, payload: { url: settings.root } },
    );
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

const myApp = new ActorSystem({
  root: "./root.mjs",
  debug: true,
});


/*

Methods: done
- spawn
- link
- become
- unbecome
- send/tell
- ask

Built-in Messages types:

- spawn     : create new actor
- start     : run start handler
- started   : reply to spawn when start is done

- stop      : run stop handler and destroy actor
- stopped   : notify linked actors when stop done

- restart   : clean up actor state
- restarted : notify linked actors when restart is done

- reply     : reply ask messages

- info      : get actor status, state, data

- crash     : notify linked actors when actor crash

- terminate : destroy actor
- died      : notify linked actors when termination is done




Components
- Actor
- ActorSystem

Support:
Node
Deno
Browser

*/
