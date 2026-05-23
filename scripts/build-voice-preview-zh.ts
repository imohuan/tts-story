import json from '../static/voice-preview-zh.json';

const out = `window.__VOICE_PREVIEW_ZH__ = ${JSON.stringify(json)};\n`;
await Bun.write(new URL('../static/voice-preview-zh.js', import.meta.url), out);
console.log('wrote static/voice-preview-zh.js');
