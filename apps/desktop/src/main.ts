/**
 * Storm Arena LIVE Quiz — tiến trình chính Electron (V3.1 mục A).
 * Server Fastify chạy NGAY TRONG tiến trình này (không cần Node/terminal), phục vụ dashboard + overlay
 * trên một cổng loopback cố định để OBS / TikTok LIVE Studio dùng một Overlay URL ổn định.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { RealScheduler } from '@quiz/live-adapters';
import { Store } from '@quiz/persistence';
import { buildApp, loadOrCreateAdminToken, SafeStorageMcVoiceCredentialStore, type QuizApp } from '@quiz/server';
import { DEMO_PACK, DEMO_QUESTIONS } from '../../../fixtures/index';

const HOST = '127.0.0.1';
const PORT = Number(process.env.QUIZ_PORT ?? 8787);
const APP_DIR = app.getAppPath();

let quiz: QuizApp | null = null;
let store: Store | null = null;
let adminToken = '';
let win: BrowserWindow | null = null;
let quitting = false;

/** Nhật ký khởi động/lỗi ở %APPDATA%\Storm Arena LIVE Quiz\logs\app.log (app GUI không có console). */
function log(msg: string) {
  try {
    const dir = join(app.getPath('userData'), 'logs');
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, 'app.log'), `${new Date().toISOString()} ${msg}
`);
  } catch {
    /* không chặn app vì lỗi ghi log */
  }
}
process.on('uncaughtException', (err) => log(`uncaughtException ${err.stack ?? err}`));
process.on('unhandledRejection', (err) => log(`unhandledRejection ${err instanceof Error ? err.stack : String(err)}`));

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

async function startServer() {
  const dataDir = app.getPath('userData');
  process.env.QUIZ_MIGRATIONS_DIR = join(APP_DIR, 'migrations');
  log(`khởi động v${app.getVersion()} appDir=${APP_DIR} dataDir=${dataDir} port=${PORT}`);
  const scheduler = new RealScheduler();
  store = new Store(join(dataDir, 'quiz.db'));
  adminToken = loadOrCreateAdminToken(join(dataDir, 'admin-token.txt'));
  store.seedQuestions(DEMO_PACK, DEMO_QUESTIONS, scheduler.now());
  quiz = await buildApp({
    store,
    scheduler,
    adminToken,
    mcVoice: {
      credentials: new SafeStorageMcVoiceCredentialStore(join(dataDir, 'mc-voice-token.dat'), {
        isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
        encryptString: (value) => safeStorage.encryptString(value),
        decryptString: (value) => safeStorage.decryptString(value),
      }),
    },
    webRoots: { dashboard: join(APP_DIR, 'web', 'dashboard'), overlay: join(APP_DIR, 'web', 'overlay') },
  });
  await quiz.recover();
  await quiz.app.listen({ host: HOST, port: PORT });
  log(`server sẵn sàng http://${HOST}:${PORT}/dashboard/`);
}

/** Thoát an toàn: đóng WS/HTTP, đóng DB (WAL checkpoint). Không gửi lệnh STOP — phiên đang dở sẽ khôi phục ở lần mở sau. */
async function shutdown() {
  try {
    await quiz?.close();
  } finally {
    store?.close();
    quiz = null;
    store = null;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 860,
    title: 'Storm Arena LIVE Quiz',
    backgroundColor: '#11142b',
    webPreferences: {
      preload: join(APP_DIR, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // Mọi link ra ngoài mở bằng trình duyệt hệ thống; cửa sổ app chỉ được ở trong server loopback.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://${HOST}:${PORT}/`)) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    void dialog
      .showMessageBox(win!, {
        type: 'question',
        buttons: ['Thoát', 'Huỷ'],
        defaultId: 1,
        cancelId: 1,
        title: 'Thoát Storm Arena',
        message: 'Thoát ứng dụng?',
        detail: 'Overlay trên OBS sẽ mất kết nối. Phiên đang chạy được lưu và sẽ chờ bạn chọn Tiếp tục / Huỷ câu / Dừng ở lần mở sau.',
      })
      .then(({ response }) => {
        if (response === 0) {
          quitting = true;
          app.quit();
        }
      });
  });
  void win.loadURL(`http://${HOST}:${PORT}/dashboard/`);
}

function buildMenu() {
  const overlayUrl = `http://${HOST}:${PORT}/overlay/`;
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Ứng dụng',
        submenu: [
          { label: 'Mở Overlay trong trình duyệt', click: () => void shell.openExternal(overlayUrl) },
          { label: 'Mở thư mục dữ liệu', click: () => void shell.openPath(app.getPath('userData')) },
          { type: 'separator' },
          { label: 'Tải lại', role: 'reload' },
          { label: 'Công cụ nhà phát triển', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: 'Thoát', click: () => win?.close() },
        ],
      },
    ]),
  );
}

// Token admin chỉ trao cho cửa sổ dashboard của chính app (qua preload), không nằm trong URL.
ipcMain.handle('storm-arena:admin-token', (e) => {
  const url = e.senderFrame?.url ?? '';
  return url.startsWith(`http://${HOST}:${PORT}/dashboard/`) ? adminToken : null;
});
ipcMain.handle('storm-arena:info', () => ({
  version: app.getVersion(),
  overlayUrl: `http://${HOST}:${PORT}/overlay/`,
  dataDir: app.getPath('userData'),
}));

app.on('before-quit', (e) => {
  if (quiz || store) {
    e.preventDefault();
    quitting = true;
    void shutdown().finally(() => app.quit());
  }
});
app.on('window-all-closed', () => app.quit());

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`không khởi động được: ${err instanceof Error ? err.stack : msg}`);
    dialog.showErrorBox(
      'Không khởi động được Storm Arena',
      msg.includes('EADDRINUSE')
        ? `Cổng ${PORT} đang bị chương trình khác dùng (có thể app đã mở ở cửa sổ khác). Đóng chương trình đó rồi mở lại.`
        : msg,
    );
    quitting = true;
    app.quit();
    return;
  }
  buildMenu();
  createWindow();
});
