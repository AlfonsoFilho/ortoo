// export default {
//   async start(params) {
//     console.log("HERE > root actor start !!!!", params);
//   },
// };

export default {
  // async start({ payload, tell, ask, ctx, spawn, id, link, info, spawnCode }) {
  async start(msg) {
    const { message, context, tell, spawn, id, link, ask, info } = msg;
    console.log(
      "ROOT:",
      "-------   Received?   ----------",
      message,
      context,
      tell
    );

    tell({ type: "ping", payload: "TEST ?", receiver: "0.0" });

    const echoId = await spawn("/examples/echo.mjs");
    console.log("ROOT: echoId", echoId);

    tell({
      type: "print",
      receiver: echoId,
      sender: id,
      payload: "print this for me please!",
    });

    const hasLink = await link(echoId);

    console.log("haslink", hasLink);

    // setTimeout(() => {
    //   tell({
    //     type: "terminate",
    //     receiver: echoId,
    //     sender: id,
    //     payload: "some reason",
    //   });
    // }, 1000);

    // const echoInfo = await info(echoId);

    // console.log("echo info", echoInfo);

    // const response = await ask({
    //   type: "ciao",
    //   receiver: echoId,
    //   payload: "hello",
    // });
    // console.log("respose", response);

    // tell({ type: "wrong", receiver: echoId, payload: "test" });

    // const actorWithBehaviourID = await spawn("./actor-with-behaviour.mjs");
    // console.log("actorWithBehaviourID", actorWithBehaviourID);
    // tell({ type: "ping", payload: "test 1", receiver: actorWithBehaviourID });
    // tell({ type: "ping", payload: "test 2", receiver: actorWithBehaviourID });
    // tell({
    //   type: "rollback",
    //   payload: "undo behaviour",
    //   receiver: actorWithBehaviourID,
    // });
    // tell({ type: "ping", payload: "test 3", receiver: actorWithBehaviourID });

    // spawnCode((...t) => console.log("t?", t));
  },
  // unknown({ type, payload }) {
  //   console.log("root unknow messages", type, payload);
  // },
};
