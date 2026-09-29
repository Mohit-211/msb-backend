const OpenAI = require("openai");
const config = require("./config");
const openai = new OpenAI({
  apiKey:config.OPENAI_KEY
});

module.exports = openai;