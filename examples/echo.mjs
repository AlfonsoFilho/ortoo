export default {
  // start(msg) { console.log('ECHO: echo start from echo', msg) },
  async print(params) {
    const { message } = params;
    console.log(
      "ECHO: printig for my friend [",
      message.sender,
      "]: ",
      message.payload
    );
  },
  async ciao(params) {
    const { reply, sender, payload } = params;
    reply({ receiver: sender, payload: payload + " world", type: "REPLY" });
  },

  async otherwise(msg) {
    console.log("unknown message", msg);
  },
};
