import { actor } from "./index.mjs";

export default actor({
    async start({ message, spawn, tell }) { // message, sender, tell, ask, spawn, link, become, unbecome

        console.log("Received?", message);
        const echoId = await spawn('./echo.mjs')
        console.log('id', echoId)
        // console.log('pid??', a)
        // tell(echoId, 'print', '[proxied] ' + message)

        return 1
    },
});

