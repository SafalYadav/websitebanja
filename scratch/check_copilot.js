import fs from 'fs';
const tools = fs.readFileSync('src/app/api/copilot/tools.ts', 'utf8');
console.log(tools.includes('setButtonAction'));
