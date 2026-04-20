const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

Menu.setApplicationMenu(null);

const isDev = !app.isPackaged;
const SERVER_URL = 'http://coms-4020-006.class.las.iastate.edu:8080';

let mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Instructor Dashboard',
    icon: path.join(__dirname, '../src/Images/Iowa_State_Cyclones_logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:8081');
  } else {
    await mainWindow.loadURL(SERVER_URL).catch(() => {
      // Handled by did-fail-load below
    });
  }

  // If the server is unreachable, show the local offline page instead of a blank screen
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _desc, validatedURL) => {
    // Ignore aborted navigations (-3) and failures on the offline page itself
    if (errorCode === -3 || (validatedURL && validatedURL.startsWith('file://'))) return;
    mainWindow.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Auto-updater ──────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return; // electron-updater doesn't work in dev mode

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', () => {
    // Notify the React app so it can show the update banner
    if (mainWindow) mainWindow.webContents.send('update-ready');
  });

  autoUpdater.on('error', (err) => {
    // Silently swallow update errors — update is optional
    console.warn('[updater] error:', err?.message ?? err);
  });

  // Check for updates shortly after launch so the app feels responsive first
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 8000);
}

// User clicked "Restart & Update" in the React banner
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
