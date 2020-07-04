
const DEFAULT = 'DEFAULT'

/**
 * @type {import('./types').ActorBuilder}
 */
export function actor(handlers, settings = {
    behavior: {
        default: DEFAULT
    }
}) {

    if (!Reflect.has(handlers, settings.behavior.default)) {
        handlers = {
            [settings.behavior.default]: handlers
        }
    }

    const behavior = {
        history: [],
        current: settings.behavior.default,
        default: settings.behavior.default
    }


    return {
        spawn: (nodeId, actorId) => Object.create(null, {
            id: { value: `${nodeId}.${actorId}` },

            handlers: {
                value: handlers,
            },
            mailbox: {
                value: []
            },
            behavior: {
                value: behavior
            }
        })
    }
}