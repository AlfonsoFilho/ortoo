import { Ortoo } from "../src/ortoo";

/**
 *
 */
test.skip("Ortoo should be a singleton", () => {
  // const ortooA = Ortoo.start();
  // const ortooB = Ortoo.start();
  // expect(ortooA).toEqual(ortooB);
});

test("should start root actor", () => {
  const log = jest.fn(console.log);
  const rootActor = {
    async start() {
      log("wha?");
    },
  };
  const ortoo = Ortoo({ root: rootActor });

  expect(log).toHaveBeenCalled();
});
test.todo("should start root actor");
