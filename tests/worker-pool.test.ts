test("use jsdom in this test file", () => {
  const element = document.createElement("div");
  expect(element).not.toBeNull();
});
import { createWorkerPool } from "../src/worker-pool";
import { Broker } from "../src/types";

class WorkerMock {
  private url: string;
  public onmessage: Function;

  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg) {
    this.onmessage({ data: msg });
  }
}

window.Worker = WorkerMock as any;
window.URL.createObjectURL = jest.fn();

test("worker pool creation", async () => {
  const log = jest.fn();
  const broker: Broker = (msg, pool) => {
    log(msg, pool);
  };
  const code = () => console.log("test");
  const pool = createWorkerPool(code, broker);
  const message = { type: "test" };
  pool.postMessage(message as any);

  expect(log).toHaveBeenCalledWith(
    message,
    expect.objectContaining({
      maxWorkers: expect.any(Number),
      currentWorker: expect.any(Number),
      workerList: expect.any(Object),
      postMessage: expect.any(Function),
    })
  );
});
test.todo("should polyfill webworker");
