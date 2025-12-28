#!/usr/bin/env node

// Run E2E tests and capture output to file
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'e2e-test-output.txt');

console.log('Running E2E tests...');
console.log(`Output will be saved to: ${outputFile}`);

try {
  const output = execSync('npx playwright test --workers=1 --retries=0 --max-failures=1 2>&1', {
    cwd: __dirname,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  
  fs.writeFileSync(outputFile, output);
  console.log('✅ Test run complete. Showing output:\n');
  console.log(output);
  
} catch (error) {
  const output = error.stdout ? error.stdout.toString() : error.message;
  fs.writeFileSync(outputFile, output);
  
  console.log('❌ Test failed. Showing output:\n');
  console.log(output);
  
  process.exit(1);
}
