import { Message, WorkerState } from "../types";
import { consume } from "./consume";
import { generateId } from "../utils/generate-id";

/**
 * tested: no
 * status: ready
 * pending:
 *  - clean comments
 *  - use getThreadId
 */
export function send(message: Message, ws: WorkerState) {
  if (!message.id) {
    message.id = generateId();
  }
  const threadId = message.receiver.split(".")[0];
  // console.log("message", message, ws);

  if (threadId === ws.workerId) {
    // when the actor is in the same thread
    consume(message, ws);
  } else if (Object.keys(ws.senders).includes(threadId)) {
    // when the actor is in another thread
    ws.senders[threadId].postMessage(message);
  } else if (threadId === "*") {
    // when message should be broadcasted to all threads
    ws.channel.postMessage(message);
  }
}
