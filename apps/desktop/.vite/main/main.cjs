"use strict";
const path = require("node:path");
const electron = require("electron");
const electronSquirrelStartup = require("electron-squirrel-startup");
if (electronSquirrelStartup) {
  electron.app.quit();
}
const createWindow = () => {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs")
    }
  });
  {
    mainWindow.loadURL("http://localhost:3000");
  }
};
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
