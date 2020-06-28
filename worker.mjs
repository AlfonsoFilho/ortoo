// import { rootActor } from './root.mjs'

onmessage = (...e) => {
    console.log('from worker', e)
}