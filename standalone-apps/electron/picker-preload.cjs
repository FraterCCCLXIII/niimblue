const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("devicePicker", {
  onDevices: (callback) => {
    ipcRenderer.on("devices", (_event, devices) => callback(devices));
  },
  select: (id) => ipcRenderer.send("select-device", id),
  cancel: () => ipcRenderer.send("cancel-device"),
});
