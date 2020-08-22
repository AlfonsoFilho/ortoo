import { bootstrapWorker } from "./worker";
import { IThread, Message, BootstrapThread, ThreadOptions } from "./types";

export function createMainThread(options: ThreadOptions) {
  return bootstrapWorker(options);
}

// export class MainThread extends IThread {
//   private _worker!: Window;
//   private callback;

//   constructor(bootstrap: BootstrapThread, options: ThreadOptions) {
//     console.log("MainThead new");
//     super(bootstrap, options);
//     bootstrap(options);
//   }

//   postMessage(msg: Message): void {
//     console.log("MAIN trhead", msg);
//     this.callback(msg);
//     // globalThis.dispatchEvent(new CustomEvent("ortoo:event", { detail: msg }));
//     // throw new Error("Method not implemented.");
//   }
//   onMessage(callback: (msg: import("./types").Message) => void): void {
//     this.callback = callback;
//     // globalThis.addEventListener("ortoo:event", (e) => console.log("WHAT?", e));
//     // throw new Error("Method not implemented.");
//   }
// }
