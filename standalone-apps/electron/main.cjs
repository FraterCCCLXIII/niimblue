const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const path = require("node:path");

const isDev = process.argv.includes("--dev") || !app.isPackaged;
const PRINTER_NAME = /niim|b21|b1s|b3s|d110|d11|d101|d101s|b1\b|b3\b/i;

let mainWindow;
let pickerWindow;
let pendingSelect;

const enableHardwareApis = () => {
  app.commandLine.appendSwitch("enable-experimental-web-platform-features");
  app.commandLine.appendSwitch("enable-web-bluetooth");
  app.commandLine.appendSwitch("enable-features", "WebBluetooth,WebBluetoothNewPermissionsBackend,FontAccess");
};

const grantDevicePermissions = () => {
  const ses = session.defaultSession;
  ses.setPermissionCheckHandler((_webContents, permission) =>
    ["serial", "bluetooth", "hid", "clipboard-read", "notifications", "local-fonts"].includes(permission),
  );
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(["serial", "bluetooth", "hid", "clipboard-read", "notifications", "media", "local-fonts"].includes(permission));
  });
  ses.setDevicePermissionHandler(() => true);
};

const closePicker = () => {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.close();
  }
  pickerWindow = undefined;
};

const finishPick = (id) => {
  if (pendingSelect) {
    pendingSelect(id ?? "");
    pendingSelect = undefined;
  }
  closePicker();
};

const openPicker = (kind, devices) => {
  if (!pickerWindow || pickerWindow.isDestroyed()) {
    pickerWindow = new BrowserWindow({
      width: 420,
      height: 480,
      parent: mainWindow,
      modal: true,
      resizable: true,
      minimizable: false,
      title: kind === "serial" ? "Serial port" : "Bluetooth printer",
      webPreferences: {
        preload: path.join(__dirname, "picker-preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    pickerWindow.setMenuBarVisibility(false);
    pickerWindow.loadFile(path.join(__dirname, "picker.html"), { query: { kind } });
    pickerWindow.on("closed", () => {
      pickerWindow = undefined;
      if (pendingSelect) {
        pendingSelect("");
        pendingSelect = undefined;
      }
    });
  }

  pickerWindow.webContents.once("did-finish-load", () => {
    if (!pickerWindow?.isDestroyed()) {
      pickerWindow.webContents.send("devices", devices);
    }
  });
  if (!pickerWindow.webContents.isLoading()) {
    pickerWindow.webContents.send("devices", devices);
  }
};

const mapBluetoothDevices = (deviceList) =>
  deviceList.map((device) => ({
    id: device.deviceId,
    name: device.deviceName || "Unknown device",
  }));

const mapSerialPorts = (portList) =>
  portList.map((port) => ({
    id: port.portId,
    name: port.displayName || port.portName || "Serial port",
  }));

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: "Pressmark",
    backgroundColor: "#ffffff",
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hidden" : "default",
    trafficLightPosition: { x: -48, y: -48 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  if (process.platform === "darwin") {
    mainWindow.setWindowButtonVisibility(false);
  }

  mainWindow.on("maximize", () => notifyMaximized(true));
  mainWindow.on("unmaximize", () => notifyMaximized(false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && !url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
    event.preventDefault();
    pendingSelect = callback;

    const preferred = deviceList.find((device) => PRINTER_NAME.test(device.deviceName ?? ""));
    if (preferred) {
      finishPick(preferred.deviceId);
      return;
    }

    openPicker("bluetooth", mapBluetoothDevices(deviceList));
  });

  mainWindow.webContents.session.on("select-serial-port", (event, portList, _webContents, callback) => {
    event.preventDefault();
    pendingSelect = callback;
    openPicker("serial", mapSerialPorts(portList));
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL ?? "http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "www", "index.html"));
  }
};

ipcMain.on("select-device", (_event, id) => finishPick(id));
ipcMain.on("cancel-device", () => finishPick(""));

const withMainWindow = (fn) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    fn(mainWindow);
  }
};

ipcMain.on("window:minimize", () => withMainWindow((win) => win.minimize()));
ipcMain.on("window:maximize", () =>
  withMainWindow((win) => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }),
);
ipcMain.on("window:close", () => withMainWindow((win) => win.close()));
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);

const notifyMaximized = (value) => {
  withMainWindow((win) => win.webContents.send("window:maximized", value));
};

enableHardwareApis();

app.whenReady().then(() => {
  grantDevicePermissions();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
