import { IThread, BootstrapThread, ThreadOptions, Message } from "./types";
import {
  parseFunction,
  removeComments,
  deserialize,
  serialize,
  futureMessage,
  generateId,
  parseModule,
  send,
  createMessageProps,
  createThreadMethods,
  createMainThreadMethods,
  makeActorObject,
  createActor,
  bootstrapWorker,
  isAddressedToCurrentThread,
  isMessage,
  getSpawnWorker,
} from "./worker";
import { getMaxThreads } from "./utils";

function buildWorker(...fn: Function[]): string[] {
  return fn.map((it) => it.toString());
}

export function createWorkerThread(options: ThreadOptions) {
  if (window.Worker && window.Blob) {
    const blob = new Blob(
      [
        ...buildWorker(
          getMaxThreads,
          parseFunction,
          removeComments,
          deserialize,
          serialize,
          isMessage,
          isAddressedToCurrentThread,
          getSpawnWorker,
          futureMessage,
          generateId,
          parseModule,
          send,
          createMessageProps,
          createThreadMethods,
          createMainThreadMethods,
          makeActorObject,
          createActor,
          bootstrapWorker
        ),
        `${bootstrapWorker.name}(${JSON.stringify(options)});`,
      ],
      {
        type: "text/javascript",
      }
    );
    const code = URL.createObjectURL(blob);
    return new Worker(code, { name: options.id });
  }
}

// export class WorkerThread extends IThread {
//   private _worker!: Worker;
//   constructor(bootstrap: BootstrapThread, options: ThreadOptions) {
//     console.log("WorkerThead new");
//     super(bootstrap, options);
//     if (window.Worker && window.Blob) {
//       const blob = new Blob(
//         [
//           ...this.buildWorker(
//             getMaxThreads,
//             parseFunction,
//             removeComments,
//             deserialize,
//             serialize,
//             futureMessage,
//             generateId,
//             parseModule,
//             send,
//             createMessageProps,
//             createThreadMethods,
//             createMainThreadMethods,
//             makeActorObject,
//             createActor,
//             bootstrapWorker
//           ),
//           `${bootstrap.name}(${JSON.stringify(options)});`,
//         ],
//         {
//           type: "text/javascript",
//         }
//       );
//       const code = URL.createObjectURL(blob);
//       this._worker = new Worker(code, options as any);
//     }
//   }

//   private buildWorker(...fn: Function[]): string[] {
//     return fn.map((it) => it.toString());
//   }

//   postMessage(msg: Message): void {
//     this._worker.postMessage(msg);
//   }
//   onMessage(callback: (msg: Message) => void): void {
//     this._worker.onmessage = (e: MessageEvent) => {
//       callback(e.data);
//     };
//   }
// }
