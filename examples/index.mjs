import { Ortoo } from "../dist/ortoo.modern.js";

console.log("ORTOO!!");

const rootActor = {
  start() {
    console.log('root actor start')
  }
}

Ortoo({
  root: "/examples/root.mjs",
  debug: true,
});
