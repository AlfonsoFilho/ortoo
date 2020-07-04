import { actor } from "./actor.mjs";

export default actor({
  async start({ payload, tell, ask, ctx, spawn, id }) {
    console.log("ROOT:", "-------   Received?   ----------", payload, ctx);

    const echoId = await spawn("./echo.mjs");
    console.log("ROOT: echoId", echoId);
    tell(
      {
        type: "print",
        receiver: echoId,
        sender: id,
        payload: "print this for me please!",
      },
    );
    const response = await ask(
      { type: "ciao", receiver: echoId, payload: "hello" },
    );
    console.log("respose", response);
  },
});
