const fs = require('fs');
const text = fs.readFileSync('src/popup/main.ts', 'utf8');
const pattern = /(?:t|tArgs|getMessage)\(['"]([^'"]+)['"]/g;
for (const match of text.matchAll(pattern)) {
  if (match[1] === 'div') {
    const start = Math.max(0, match.index - 20);
    const end = Math.min(text.length, match.index + match[0].length + 20);
    console.log('Found at index', match.index, ':', text.slice(start, end));
  }
}
