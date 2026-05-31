import * as fs from 'fs';
import * as readline from 'readline';

async function findHistory() {
  const logFile = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\e49e9f72-a8c8-4d54-bd56-aaa4a18c969a\\.system_generated\\logs\\transcript.jsonl';
  if (!fs.existsSync(logFile)) {
    console.log('Log file does not exist');
    return;
  }

  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching for QRISScanner.tsx modifications in previous conversation...');
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'replace_file_content' || tc.name === 'write_to_file' || tc.name === 'multi_replace_file_content') {
            const args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments;
            if (args.TargetFile && args.TargetFile.includes('QRISScanner.tsx')) {
              console.log('\n--- Found tool call:', tc.name, 'at step:', obj.step_index);
              console.log('Description:', args.Description || args.Instruction);
              if (tc.name === 'replace_file_content') {
                console.log('TargetContent:\n', args.TargetContent);
                console.log('ReplacementContent:\n', args.ReplacementContent);
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

findHistory();
