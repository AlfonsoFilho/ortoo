export class MainThread implements AbstractWorker {
  private worker = {
    name: "0",
    postMessage: (msg) => {
      this.onmessage(msg);
    },
    dispatchEvent: (ev) => {
      globalThis.dispatchEvent(ev);
    },
    addEventListener: globalThis.addEventListener,
    onmessage: (msg) => {},
  };

  constructor(code: Function, options: Record<string, any>) {
    code(this.worker);

    globalThis.addEventListener("ortoo:event", (e) => {
      this.onmessage(e.detail);
    });
  }

  postMessage(msg) {
    this.worker.onmessage({ data: msg });
  }

  onerror = () => {};

  addEventListener() {}

  removeEventListener() {}

  onmessage = (msg) => {};
}
