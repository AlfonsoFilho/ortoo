import { SPAWN } from './constants.mjs'


class ActorsNode {

    #autoIncrement = 0

    constructor() {
        // this.#autoIncrement = 0;
        this.actors = {}
    }

    /**
     * @param url {string}
     */
    async spawn(url) {
        const actorDef = await import(url).then(mod => mod.default)
        const actor = actorDef.spawn(self.name, ++this.#autoIncrement)

        this.actors[actor.id] = actor

        console.log('spawn: ', this.actors)
        this.tell({ type: 'start', receipt: actor.id, sender: actor.id, message: 'spawining' })
    }

    tell({ type, receipt, sender, message }) {
        if (receipt[0] === self.name) {
            console.log('local')
            this.post({ type, receipt, sender, message })
        } else {
            postMessage({ type, receipt, sender, message })
        }
        // self.dispatchEvent(new CustomEvent('thespis:post', { detail: data }))
    }

    post({ type, receipt, sender, message }) {
        const actor = this.actors[receipt]
        const behavior = actor.behavior.current
        actor.handlers[behavior][type]({ type, receipt, sender, message, tell: (msg) => this.tell({ ...msg, sender: actor.id }) })
    }
}

const node = new ActorsNode()

// self.addEventListener('thespis:post', (e) => {
//     console.log('post', e.detail)
// })

onmessage = async ({ data }) => {
    console.log('worker ' + self.name, data)

    switch (data.cmd) {
        case SPAWN:
            node.spawn(data.url)
            break;

        default:
            break;
    }
}



// const handlers = {

// }



// onmessage = async function onMessageHandler(e) {
//     console.log('from worker', this.name, e.data)
//     // debugger

//     const { id, behavior, type, url } = e.data

//     handlers[id] = await import(url).then(mod => mod.default.handlers)
//     // const a = await importScripts(e.data.url)
//     console.log('imported?', handlers)



//     const result = await handlers[id][behavior][type]({
//         message: e.data.message,
//         spawn: (url, options) => {

//             return new Promise((resolve, reject) => {
//                 postMessage({ cmd: 'spawn', actor: { url } })

//                 setTimeout(() => reject('nothing'), 1000)
//             })


//             // self.addEventListener('test', e => console.log('test', e), { once: true })

//             // self.dispatchEvent(new CustomEvent('test', { detail: url }))
//             // // return new Promise
//             // return import(url)
//             //     .then(mod => mod.default)
//             //     .then(actor => {
//             //         self.onmessage
//             //         debugger
//             //         postMessage({
//             //             cmd: 'spawn', actor: {

//             //             }
//             //         })
//             //         return actor
//             //     })

//         }
//     })

//     console.log(result)

//     postMessage({ id: this.name, data: result })
// }