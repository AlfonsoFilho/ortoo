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

    tell({ type: "wrong", receiver: echoId, payload: "test" });

    const actorWithBehaviourID = await spawn("./actor-with-behaviour.mjs");
    console.log("actorWithBehaviourID", actorWithBehaviourID);
    tell({ type: "ping", payload: "test 1", receiver: actorWithBehaviourID });
    tell({ type: "ping", payload: "test 2", receiver: actorWithBehaviourID });
    tell(
      {
        type: "rollback",
        payload: "undo behaviour",
        receiver: actorWithBehaviourID,
      },
    );
    tell({ type: "ping", payload: "test 3", receiver: actorWithBehaviourID });
  },
});
