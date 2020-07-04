import { STARTED } from './constants.mjs';

const DEFAULT = "DEFAULT";

/**
 * @type {import('./types').ActorBuilder}
 */
export function actor(handlers, settings = {
  behavior: {
    default: DEFAULT,
  },
}) {
  if (!Reflect.has(handlers, settings.behavior.default)) {
    handlers = {
      [settings.behavior.default]: handlers,
    };
  }

  const originalStart = handlers[settings.behavior.default].start

  handlers[settings.behavior.default].start = (message) => {

    if (typeof originalStart === 'function') {
      originalStart(message)
    }

    message.tell({ type: STARTED, receiver: message.sender, sender: message.id })
  }

  const behavior = {
    history: [],
    current: settings.behavior.default,
    default: settings.behavior.default,
  };

  return {
    spawn: (nodeId, actorId, url) =>
      Object.create(null, {
        id: { value: `${nodeId}.${actorId}-${url}` },

        handlers: {
          value: handlers,
        },
        mailbox: {
          value: [],
        },
        behavior: {
          value: behavior,
        },
      }),
  };
}
