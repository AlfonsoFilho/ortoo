

const DEFAULT = 'DEFAULT'

function spawn(actorSystem, actorDefinition) {
    const id = Math.random().toString(36).substr(2, 9);
    actorSystem.actors[id] = Object.assign(actorDefinition, { id });

    return id
}

function tell(receiver, sender, type, message) {
    const msg = {
        sender,
        receiver,
        type,
        message,
    };

    globalThis.dispatchEvent(new CustomEvent("actor:message", { detail: msg }));
}

function createWorkerCode(id) {
    const workerCode = `
    onmessage = function onMessageHandler(e){
        console.log('from worker', ${id}, e)
    }
`;
    const blob = new Blob([workerCode], { type: "application/javascript" });

    return URL.createObjectURL(blob);
}

function ActorSystem(settings) {
    const workerList = {};
    let currentWorker = 0;
    let maxWorkers = window.navigator.hardwareConcurrency - 1;

    this.actors = {};

    for (let i = 0; i <= maxWorkers; i++) {
        workerList[i] = new Worker(createWorkerCode(i));
    }
    console.log(workerList);

    if (settings.root) {
        spawn(this, settings.root);
    }

    globalThis.addEventListener("actor:message", ({ detail }) => {
        console.log("on messaage", detail, this.actors);

        if (detail.receiver in this.actors) {
            // console.log("actor?", this.actors[detail.sender]);
            workerList[currentWorker].postMessage(detail);
            currentWorker = currentWorker < maxWorkers ? currentWorker + 1 : 0;
            this.actors[detail.receiver].handlers[this.actors[detail.receiver].behavior.current][detail.type]({
                message: detail.message,
                sender: detail.sender,
                spawn: (actorDefinition) => spawn(this, actorDefinition),
                tell: (id, type, message) => tell(id, detail.sender, type, message)
            });
        }
    });

    if (settings.debug) {
        globalThis.Thesis = {
            version: 1,
            getActors: () => this.actors,
            tell: (pid, text) => tell(pid, "repl", "start", text),
        };
    }
}


export function actor(handlers, {
    default_behaviour = DEFAULT
} = {}) {

    if (!Reflect.has(handlers, default_behaviour)) {
        handlers = {
            [default_behaviour]: handlers
        }
    }

    return Object.create(null, {
        // id: {
        //     value: Symbol.for(Math.random().toString(36).substr(2, 9)),
        //     writable: false,
        // },
        handlers: {
            value: handlers,
            writable: false
        },
        mailbox: {
            value: []
        },
        behavior: {
            value: {
                current: DEFAULT
            },
        }
    });
}


const echo = actor({
    print({ message }) {
        console.log('Echo:', message)
    }
})

const rootActor = actor({
    start({ message, spawn, tell }) { // message, sender, tell, ask, spawn, link, become, unbecome
        console.log("Received", message);
        const a = spawn(echo)
        console.log('pid??', a)
        tell(a, 'print', '[proxied] ' + message)
    },
});


const myApp = new ActorSystem({
    actors: [rootActor, echo],
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
