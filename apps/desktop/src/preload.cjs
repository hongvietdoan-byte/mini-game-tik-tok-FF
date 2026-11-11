// Preload (sandbox): chỉ lộ 2 hàm tối thiểu cho dashboard. Không lộ ipcRenderer hay Node.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stormArena', {
  /** Mã quản trị của server cục bộ — chỉ trả cho trang /dashboard/ của chính app. */
  getAdminToken: () => ipcRenderer.invoke('storm-arena:admin-token'),
  /** { version, overlayUrl, dataDir } */
  getInfo: () => ipcRenderer.invoke('storm-arena:info'),
});
