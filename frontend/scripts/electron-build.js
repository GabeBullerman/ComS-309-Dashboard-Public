#!/usr/bin/env node
/**
 * Runs electron-builder with ELECTRON_RUN_AS_NODE cleared so the packager
 * invokes the real Electron binary rather than a Node.js shim.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const builderBin = path.join(__dirname, '..', 'node_modules', '.bin', 'electron-builder');

const child = spawn('npx', ['electron-builder'], {
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('close', (code) => process.exit(code ?? 0));
