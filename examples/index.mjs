import { Ortoo } from "../dist/ortoo.modern.js";

console.log("ORTOO!!");

const rootActor = {
  config: {
    name: "test",
  },
  start() {
    console.log("whoami", self);
    console.log("root actor start");
  },
};

export const ortoo = Ortoo({
  root: rootActor,
  debug: true,
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
