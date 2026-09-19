const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("niimblueDesktop", {
  isDesktop: true,
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
    onMaximized: (callback) => {
      const listener = (_event, value) => callback(value);
      ipcRenderer.on("window:maximized", listener);
      return () => ipcRenderer.removeListener("window:maximized", listener);
    },
  },
});
