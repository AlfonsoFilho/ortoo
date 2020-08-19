import { MainThread } from "./main-thread";

export class Thread {
  private _worker!: Worker | MainThread;

  constructor(code: Function, options: { maxWorkers: number } & WorkerOptions) {
    if (options.name === "0") {
      this._worker = new MainThread(code, options);
    } else {
      if (window.Worker && window.Blob) {
        const blob = new Blob(
          [
            "(",
            code.toString(),
            ")(",
            "undefined,",
            JSON.stringify(options),
            ")",
          ],
          {
            type: "text/javascript",
          }
        );
        const url = URL.createObjectURL(blob);
        this._worker = new Worker(url, options);
      }
    }
  }

  public postMessage(msg) {
    this._worker.postMessage(msg);
  }

  public setOnMessage(callback: (ev: MessageEvent) => void) {
    this._worker.onmessage = callback;
  }
}
