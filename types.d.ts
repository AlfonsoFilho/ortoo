export interface Address {
  worker: number;
  id: number;
}

type NodeID = number;
type ActorID = number;

export interface Context {
  currentWorker: string;
  workers: string[];
}

export interface Message {
  id: string;
  sender: string;
  receiver: string;
  type: string | number;
  payload: any;
}

type MessageHandler = ({ state: object }) => object;

interface Handlers {
  [behavior: string]: {
    [action: string]: MessageHandler;
  };
}

interface ActorSettings {
  behavior: {
    default: string;
    discard: boolean;
  };
  keepAlive: boolean;
  trapExit: boolean;
  label: string;
  discardLetters: boolean;
}

export type Actor = {
  id: [NodeID, ActorID];
  mailbox: Message[];
  handlers: Handlers;
  behavior: {
    history: string[];
    current: string;
    default: string; // do we need it?
  };
  config: {
    discardBehavior: boolean;
    discardLetters: boolean;
    timeout: number;
    keepAlive: boolean;
    trapExit: boolean;
  };
  priority: number;
  status: number;
  links: [];
  state: any;
  label: string;
};

export type ActorBuilder = (
  handlers: object,
  settings: ActorSettings,
) => {
  spawn: (id: number) => Actor;
};
