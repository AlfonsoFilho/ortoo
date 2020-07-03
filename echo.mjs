import { actor } from "./actor.mjs";

export default actor({
  print({ message }) {
    console.log("Echo:", message);
  },
});
