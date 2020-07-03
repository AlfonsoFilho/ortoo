

const DEFAULT = 'DEFAULT'

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
        // mailbox: {
        //     value: []
        // },
        behavior: {
            value: {
                current: DEFAULT
            },
        }
    });
}
