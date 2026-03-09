#!/usr/bin/env node
/**
 * Launches Electron for development, explicitly clearing ELECTRON_RUN_AS_NODE.
 * That env var is set by Expo/Metro for its internal tools and causes Electron
 * to run as plain Node.js (no window, no Chromium) if left set.
 */
const { spawn } = require('child_process');
const electronPath = require('electron'); // npm package exports the binary path

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['electron/main.js'], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 0));
