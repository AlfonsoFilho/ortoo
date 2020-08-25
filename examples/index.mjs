// Broadcast MVP

// function ChannelAndBroadcastMessagingMVP() {
//   const cores = navigator.hardwareConcurrency
//   const workers = {}

//   console.log(`ChannelAndBroadcastMessagingMVP :: hi, you have ${cores} cores.`)

//   function worker(thread = self) {
//     console.log('Started worker ', thread.name)
//     const receivers = {};
//     const senders = {};
//     const channel = new BroadcastChannel('ortoo')

//     // Broadcast handler
//     channel.onmessage = ({ data }) => {
//       console.log(`worker ${thread.name} received broadcasted message: `, data)
//     }

//     // Worker PostMessage handler
//     thread.onmessage = (e => {
//       if (e.data.receiver_port) {
//         receivers[e.data.worker] = e.data.receiver_port
//         receivers[e.data.worker].onmessage = (e) => {
//           if (e.data.reply) {
//             console.log(thread.name, 'RECEIVER-PORT received ', e)
//             senders[e.data.sender].postMessage('hi back')
//             channel.postMessage('Hi everybody from ' + thread.name)
//           } else {
//             console.log(thread.name, 'RECEIVER-PORT received ', e)
//           }

//         }
//       }

//       if (e.data.sender_port) {
//         senders[e.data.worker] = e.data.sender_port
//       }
//     })

//     // setTimeout(() => {
//     //   // console.log('receivers in worker', thread.name, receivers, senders)
//     //   // console.log('servers', thread.name, receivers, senders)

//     //   if (thread.name == 2) {
//     //     senders[0].postMessage({ txt: 'Hi from 2!!', reply: true, sender: thread.name })
//     //     // connections[5].receiver.postMessage({ payload: 'receiver.postMessage - Hello, Im worker 2!', sender: '2', receiver: '5' })
//     //     // connections[5].sender.postMessage({ payload: 'sender.postMessage - Hello, Im worker 2! ??????', sender: '2', receiver: '5' })
//     //     // receivers[5].postMessage({ payload: 'Hello, Im worker 2!', sender: '2', receiver: '5' })
//     //   }
//     // }, 3000)
//   }

//   const mainWorker = {
//     port: undefined,
//     name: '0',
//     addEventListener: () => { },
//     onmessage: () => { },
//     postMessage(data, port) {
//       this.port = port[0]
//       this.onmessage({ data })
//     }
//   }

//   worker(mainWorker)

//   workers[0] = mainWorker

//   // Create workers
//   for (let i = 1; i < cores; i++) {
//     const code = URL.createObjectURL(new Blob(['(', worker.toString(), ')()']))
//     workers[i] = new Worker(code, { name: i })
//   }

//   // Setup ports
//   for (let i = 0; i < cores; i++) {
//     for (let j = 0; j < cores; j++) {
//       if (i !== j) {
//         const channel = new MessageChannel()
//         workers[i].postMessage({ worker: j, receiver_port: channel.port1 }, [channel.port1])
//         workers[j].postMessage({ worker: i, sender_port: channel.port2 }, [channel.port2])
//       }
//     }
//   }
// }

// ChannelAndBroadcastMessagingMVP()

// // setTimeout(() => {
// const channel = new BroadcastChannel('ortoo')
// channel.onmessage = (e) => console.log('main trad received a message: ', e)
// channel.postMessage('Hi from main thread')
// // }, 2000)

// import { Ortoo, OrtooDebugger } from "../dist/ortoo.modern.js";

// console.log("ORTOO!!");

// const rootActor = {
//   config: {
//     name: "test",
//   },
//   async start(messageProps) {
//     const { context, spawn, info } = messageProps;
//     console.log("ROOT ACTOR: whoami", self);
//     console.log("ROOT ACTOR: context", context);
//     console.log("ROOT ACTOR: root actor start");
//     console.log("ROOT ACTOR: root actor has info?", info);
//     const id = await spawn({
//       start() {
//         console.log("CHILD ACTOR: spawned !!!!");
//       },
//     });
//     console.log("ROOT ACTOR: spawned id: ", id);
//   },
// };

// export const ortoo = Ortoo({
//   root: "/examples/root.mjs",
//   debug: true,
//   plugins: [OrtooDebugger],
// });

// --- OLD ---

import { Ortoo } from "../dist/ortoo.modern.js";

console.log("ORTOO!!");

// const rootActor = {
//   start() {
//     console.log("root actor start");
//   },
// };

Ortoo({
  root: "/examples/root.mjs",
  debug: true,
});
