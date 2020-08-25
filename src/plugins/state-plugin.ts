import { ActorObject, Message, WorkerState } from "../types";
import { futureMessage } from "../utils/future-message";

export function statePlugin(
  actor: ActorObject,
  _message: Message,
  ws: WorkerState,
  stage: string
) {
  const hooks = {
    param: {
      setState(newState) {
        actor.state = newState;
      },
      getState() {
        return actor.state;
      },
      async info(id) {
        const resp = await futureMessage(
          {
            type: "info",
            receiver: id,
            sender: actor.id,
          },
          ws
        );

        return resp.payload;
      },
    },
  };

  return hooks[stage];
}
