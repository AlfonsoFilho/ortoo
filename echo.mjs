import { actor } from "./actor.mjs";

export default actor({
  // start(msg) { console.log('ECHO: echo start from echo', msg) },
  print(message) {
    console.log(
      "ECHO: printig for my friend [",
      message.sender,
      "]: ",
      message.payload,
    );
  },
});
