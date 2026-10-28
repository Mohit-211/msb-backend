const openai = require('../../config/openAi.js')

async function generateStoryFromTitle(userTitle) {
  const messages = [
    {
      role: "system",
      content: `
        You are an AI story writer that only creates **realistic**, **real-world**, **grounded**, interesting short stories (250-350 words). 
        Rules:
      - No fantasy, no sci-fi, no magic.
      - Set in present-day realistic settings.
      - Use basic, simple human english words.
      - Do not include imaginary creatures or magical events or imaginary places everything must be pick accoring to real world.
      
      - Do not include fantasy, magic, fairy tales, superheroes, or fictional creatures.
      - Base the story in modern-day real life — settings like cities, colleges, workplaces, sometimes numbers, etc.
      - Avoid formal openings like "Once upon a time". Just begin the story naturally.
      - If the user input is a question or not a valid title, politely ask for a better title.
      `.trim()
    },
    {
      role: "user",
      content: `
      
      User Title: "${userTitle}"
      Generate a short, realistic story based on the above title using context for inspiration.
      Do not copy the stories. Keep it fresh but grounded.
      `.trim()
    }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.8,
    max_tokens: 800,
    top_p: 0.9,
  });

  const sanitizedStory = sanitizeText(completion.choices[0].message.content);
  return sanitizedStory;
}
// The output is stored and later published as blog HTML, so escape anything the model (or a crafted prompt) adds.
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeText(text) {
  return text
    .split("\n")
    .filter(line => line.trim() !== "")
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

async function generateShortStory(input) {
  const messages = [
    {
      role: "system",
      content: `
      You are an AI that summarizes long realistic stories into short, **realistic**, **real-world**, **grounded**, **interesting** short story .

      Rules:
      - No fantasy, no disney, no sci-fi, no magic.
      - Use real-world, conversationsl, modern-day settings only.
      - The summary must be **between 100-120 words**.
      - Use basic, natural, human English.
      - Make it sound like a quick teaser or logline.
      - Focus on key people, places, or events from the input.
      - Do not start with "Once upon a time" or similar.
      - Don't use generic phrases like "this is a story about..."
      `.trim()
    },
    {
      role: "user",
      content: `
      Long Story: "${input}"
      Summarize the above realistic story in one sentence (100-120 words), grounded in real life.
      `.trim()
    }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.7,
    max_tokens: 500, 
    top_p: 0.9,
  });

  const shortSummary = sanitizeText(completion.choices[0].message.content);
  return shortSummary;
}


module.exports = {
  generateStoryFromTitle,
  generateShortStory,
}