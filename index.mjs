import { rootActor } from "./root.mjs";
function spawn(actorSystem, actorDefinition) {
    const length = Object.keys(actorSystem.actors).length;
    actorSystem.actors[length + 1] = actorDefinition;
    console.log(actorDefinition.start.toString());
}

function tell(receiver, sender, type, message) {

    const msg = {
        sender,
        receiver,
        type,
        message
    }

    globalThis.dispatchEvent(new CustomEvent("actor:message", { detail: msg }))
}

function ActorSystem(settings) {
    const workerList = {};
    const workerURL = new URL("worker.mjs", window.location.origin);

    this.actors = {};

    for (let i = 0; i < window.navigator.hardwareConcurrency; i++) {
        workerList[i] = new Worker(workerURL);
    }


    if (settings.root) {
        spawn(this, settings.root);
    }

    globalThis.addEventListener("actor:message", ({ detail }) => {
        console.log("on messaage", detail, this.actors);

        if (detail.sender in this.actors) {
            console.log('actor?', this.actors[detail.sender])
            workerList[0].postMessage(detail)
            this.actors[detail.sender][detail.type]({ ...detail })
        }

    });

    if (settings.debug) {
        globalThis.Thesis = {
            version: 1,
            getActors: () => this.actors,
            tell: (pid, text) => tell('repl', pid, 'start', text),
        };
    }
}

export function actor(def) {
    return def
}


const myApp = new ActorSystem({
    root: rootActor,
    debug: true,
});
/*

Methods:
- spawn
- link
- become
- unbecome
- send/tell
- ask

Messages:
- start
- stop
- down
- crash
- kill
- restart
- died

Components
- Actor
- ActorSystem


Support:
Node
Deno
Browser
*/
