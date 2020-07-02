const handlers = {

}



onmessage = async function onMessageHandler(e) {
    console.log('from worker', this.name, e.data)
    // debugger

    const { id, behavior, type, url } = e.data

    handlers[id] = await import(url).then(mod => mod.default.handlers)
    // const a = await importScripts(e.data.url)
    console.log('imported?', handlers)



    const result = await handlers[id][behavior][type]({
        message: e.data.message,
        spawn: (url, options) => {

            return new Promise((resolve, reject) => {
                postMessage({ cmd: 'spawn', actor: { url } })

                setTimeout(() => reject('nothing'), 1000)
            })


            // self.addEventListener('test', e => console.log('test', e), { once: true })

            // self.dispatchEvent(new CustomEvent('test', { detail: url }))
            // // return new Promise
            // return import(url)
            //     .then(mod => mod.default)
            //     .then(actor => {
            //         self.onmessage
            //         debugger
            //         postMessage({
            //             cmd: 'spawn', actor: {

            //             }
            //         })
            //         return actor
            //     })

        }
    })

    console.log(result)

    postMessage({ id: this.name, data: result })
}