const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
Menu.setApplicationMenu(null);
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');

const isDev = !app.isPackaged;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

/**
 * Spins up a minimal static HTTP server to serve the Expo web export.
 * A real server (rather than file://) is required because Expo's web output
 * uses absolute paths (e.g. /_expo/static/js/...) that don't resolve under
 * the file:// protocol.
 */
function startStaticServer(distPath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url);
      let filePath = path.join(distPath, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);

      fs.stat(filePath, (statErr, stat) => {
        // If not found or is a directory, fall back to index.html (SPA)
        if (statErr || stat.isDirectory()) {
          filePath = path.join(distPath, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });
    });

    // Port 0 lets the OS pick a free port
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    server.on('error', reject);
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Instructor Dashboard',
    icon: path.join(__dirname, '../src/Images/Iowa_State_Cyclones_logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    await win.loadURL('http://localhost:8081');
  } else {
    await win.loadURL('http://coms-4020-006.class.las.iastate.edu:8080');
  }

  // Open any links that try to open a new window in the system browser instead
  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
