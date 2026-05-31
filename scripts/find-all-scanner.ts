import * as fs from 'fs';
import * as readline from 'readline';

async function findHistory() {
  const logFile = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\52e2d152-983d-44b5-b7e3-1288bcec42db\\.system_generated\\logs\\transcript.jsonl';
  if (!fs.existsSync(logFile)) return;
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.toLowerCase().includes('qrisscanner.tsx') && line.includes('replace_file') && line.includes('105')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            const args = tc.args || {};
            console.log(`\n=== Step ${obj.step_index} (${tc.name}) ===`);
            console.log('Description:', args.Description);
            console.log('TargetContent:\n', args.TargetContent);
            console.log('ReplacementContent:\n', args.ReplacementContent);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

findHistory();
