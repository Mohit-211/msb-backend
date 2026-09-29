const fs = require('fs')
const { getEmbedding } = require('./utils.js')
const path = require('path')

const stories = JSON.parse(fs.readFileSync(path.join(__dirname, './stories.json'), 'utf-8'));

const embedStories = async () => {
    console.log("✅ Embeddings started!");
    const data = await Promise.all(
        stories.map(async story => ({
            ...story,
            embedding: await getEmbedding(story.title)
        }))
    );
    fs.writeFileSync('./embeddedStories.json', JSON.stringify(data, null, 2));
    
};

// embedStories()
// .then(res => {
//     console.log("✅ Embeddings saved!");
// })
// .catch(err =>{
//     console.log("✅ Embeddings Error : ", err);
// })
