const openai = require('../../config/openAi.js')

async function getEmbedding(text) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return res.data[0].embedding;
}

 function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val ** 2, 0));
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val ** 2, 0));
  return dot / (magA * magB);
}

module.exports = {
  getEmbedding,
  cosineSimilarity
}