import { RealityDefender } from '@realitydefender/realitydefender';

const apiKey = 'rd_5c48624790b8f77b_983f08dee1e2a47538da4eab9212eb78';
const filePath = process.argv[2];

if (!filePath) {
    console.error(JSON.stringify({ error: "No file path provided" }));
    process.exit(1);
}

async function run() {
    try {
        const realityDefender = new RealityDefender({ apiKey });
        const result = await realityDefender.detect({ filePath });
        console.log(JSON.stringify(result));
    } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}

run();
