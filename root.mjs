import { actor } from "./actor.mjs";

export default actor({
  // async start({ message, spawn, tell }) { // message, sender, tell, ask, spawn, link, become, unbecome
  async start({ message, tell }) { // message, sender, tell, ask, spawn, link, become, unbecome
    console.log("Received?", message);

    tell({ type: "test", receipt: "1.2", sender: "", message: "replying" });
    // const echoId = await spawn('./echo.mjs')
    // console.log('id', echoId)
    // // console.log('pid??', a)
    // // tell(echoId, 'print', '[proxied] ' + message)

    // return 1
  },
});
