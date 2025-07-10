const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('get-data'),
  saveProductos: (productos) => ipcRenderer.invoke('save-productos', productos),
  saveCliente: (cliente) => ipcRenderer.invoke('save-cliente', cliente),
  exportarRemito: (remito) => ipcRenderer.invoke('exportar-remito', remito)
});