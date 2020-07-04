import { actor } from './actor.mjs'

/**@type { import('./types').ActorSettings} */
const actorConfig = {
    behavior: {
        default: 'sideB'
    }
}

export default actor({
    sideA: {
        ping({ payload: msg, become }) {
            console.log('sideA ping', msg)
            become('sideB')
        },
        rollback({ unbecome }) {
            unbecome()
            console.log('rollback')
        }
    },
    sideB: {
        ping({ payload: msg, become }) {
            console.log('sideB ping', msg)
            become('sideA')
        },
        rollback({ unbecome }) {
            unbecome()
            console.log('rollback')
        }
    }
}, actorConfig)