#!/usr/bin/env node

/**
 * Test Summary Reporter
 * 
 * Parses vitest output and shows clear summary of failing tests
 */

const { spawn } = require('child_process');
const path = require('path');

const vitestPath = path.join(__dirname, 'node_modules', '.bin', 'vitest');

const proc = spawn('node', [vitestPath, 'run'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true
});

let output = '';
let failedTests = [];
let passedTests = [];
let currentSuite = '';

proc.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
  
  // Parse for test results
  const lines = text.split('\n');
  lines.forEach(line => {
    if (line.includes('describe')) {
      currentSuite = line.match(/'([^']+)'/)?.[1] || currentSuite;
    }
    if (line.includes('✓')) {
      const match = line.match(/✓\s+(.+)/);
      if (match) passedTests.push({ suite: currentSuite, test: match[1].trim() });
    }
    if (line.includes('✕') || line.includes('×')) {
      const match = line.match(/[✕×]\s+(.+)/);
      if (match) failedTests.push({ suite: currentSuite, test: match[1].trim() });
    }
  });
});

proc.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stderr.write(text);
});

proc.on('close', (code) => {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  if (passedTests.length > 0) {
    console.log(`\n✓ PASSED (${passedTests.length}):`);
    passedTests.forEach(t => {
      console.log(`  ${t.suite ? '[' + t.suite + '] ' : ''}${t.test}`);
    });
  }
  
  if (failedTests.length > 0) {
    console.log(`\n✕ FAILED (${failedTests.length}):`);
    failedTests.forEach(t => {
      console.log(`  ${t.suite ? '[' + t.suite + '] ' : ''}${t.test}`);
    });
    console.log('\n⚠️  See details above ↑');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Total: ${passedTests.length} passed, ${failedTests.length} failed`);
  console.log('='.repeat(80) + '\n');
  
  process.exit(code);
});
