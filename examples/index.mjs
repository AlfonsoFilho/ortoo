import { Ortoo, OrtooDebugger } from "../dist/ortoo.modern.js";

console.log("ORTOO!!");

const rootActor = {
  config: {
    name: "test",
  },
  async start() {
    const { context, spawn, info } = messageProps;
    console.log("ROOT ACTOR: whoami", self);
    console.log("ROOT ACTOR: context", context);
    console.log("ROOT ACTOR: root actor start");
    console.log("ROOT ACTOR: root actor has info?", info);
    const id = await spawn({ start() { console.log('CHILD ACTOR: spawned !!!!') } })
    console.log('ROOT ACTOR: spawned id: ', id)
  },
};

export const ortoo = Ortoo({
  root: rootActor,
  debug: true,
  middleware: [OrtooDebugger]
});

// console.log('Ortoo?', ortoo, window?.Ortoo)

// --- OLD ---
// import { Ortoo } from "../dist/ortoo.modern.js";

// console.log("ORTOO!!");

// const rootActor = {
//   start() {
//     console.log("root actor start");
//   },
// };

// Ortoo({
//   root: "/examples/root.mjs",
//   debug: true,
// });
