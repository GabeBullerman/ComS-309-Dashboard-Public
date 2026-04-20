const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Called by the React app to listen for a downloaded update being ready to install
  onUpdateReady: (cb) => ipcRenderer.on('update-ready', () => cb()),
  // Called by the React app when the user clicks "Restart & Update"
  installUpdate: () => ipcRenderer.send('install-update'),
});
