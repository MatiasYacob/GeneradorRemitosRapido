const { contextBridge, ipcRenderer } = require('electron');

// preload.js  :contentReference[oaicite:1]{index=1}
contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveProductos: (productos) => ipcRenderer.invoke('save-productos', productos),
  saveCliente: (cliente) => ipcRenderer.invoke('save-cliente', cliente),
  exportarRemito: (remito) => ipcRenderer.invoke('exportar-remito', remito),
  confirmDelete: (msg) => ipcRenderer.invoke('confirm-delete', msg) // <-- nuevo
});
