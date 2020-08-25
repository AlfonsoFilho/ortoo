import { ActorObject, Message, WorkerState } from "../types";

export function behaviorPlugin(
  actor: ActorObject,
  _message: Message,
  _ws: WorkerState,
  stage: string
) {
  const hooks = {
    param: {
      become(behavior: string) {
        const BEHAVIOR_HISTORY_LIMIT = 20;
        if (actor.behavior._history.length <= BEHAVIOR_HISTORY_LIMIT) {
          actor.behavior._history.push(actor.behavior._current);
        } else {
          const [_, ...history] = actor.behavior._history;
          actor.behavior._history = [...history, actor.behavior._current];
        }

        actor.behavior._current = behavior;
      },
      unbecome() {
        if (actor.behavior._history.length > 0) {
          actor.behavior._current = actor.behavior._history.pop() ?? "DEFAULT";
        } else {
          actor.behavior._current = "DEFAULT";
          // actor.behavior.current = actor.behavior.default;
        }
      },
    },
  };

  return hooks[stage];
}
