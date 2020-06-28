import { actor } from './index.mjs';

export const rootActor = actor({
    start({ message }) { // message, sender, tell, ask, spawn, link, become, unbecome
        console.log("Received", message);
    },
});