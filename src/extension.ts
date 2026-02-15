import * as vscode from 'vscode';
import { AntigravityAPI } from './api/antigravity';
import { ProcessFinder, ProcessInfo } from './auth/processFinder';
import { StatusBarManager } from './ui/statusBar';
import { DetailPanel } from './ui/webviewPanel';
import { TokenUsage, NotificationState } from './models/types';
import { REFRESH_INTERVAL_MS, NOTIFICATION_THRESHOLDS } from './utils/constants';

let statusBarManager: StatusBarManager;
let apiClient: AntigravityAPI;
let processFinder: ProcessFinder;
let processInfo: ProcessInfo | null = null;
let refreshInterval: NodeJS.Timeout | null = null;
let notificationState: NotificationState = {
  eightyPercent: false,
  ninetyPercent: false,
  ninetyFivePercent: false,
  ninetyNinePercent: false
};
let isInitialized = false;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Antigravity Token Watcher aktif edildi');

  // Servisleri başlat
  statusBarManager = new StatusBarManager();
  apiClient = new AntigravityAPI();
  processFinder = new ProcessFinder();

  // Komutları kaydet
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravitytokenwatcher.refresh', refreshTokenUsage),
    vscode.commands.registerCommand('antigravitytokenwatcher.showDetails', showDetails),
    vscode.commands.registerCommand('antigravitytokenwatcher.reconnect', reconnect)
  );

  // Asenkron olarak başlat (VSCode startup'ı bloklamamak için)
  initializeExtension().catch(err => {
    console.error('Initialization failed:', err);
  });

  // Cleanup
  context.subscriptions.push({
    dispose: () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      statusBarManager.dispose();
    }
  });
}

async function initializeExtension() {
  if (isInitialized) {
    return;
  }

  statusBarManager.updateLoading();

  try {
    // Antigravity process'ini bul
    processInfo = await processFinder.detectProcessInfo();

    if (processInfo) {
      console.log('Antigravity process bulundu:', {
        pid: processInfo.pid,
        port: processInfo.connectPort
      });

      // API client'ı başlat
      apiClient.init(processInfo.connectPort, processInfo.csrfToken);

      // İlk veri çekme
      await refreshTokenUsage();

      // Otomatik yenileme başlat
      startAutoRefresh();

      isInitialized = true;
    } else {
      statusBarManager.updateError('Antigravity bulunamadı');
      vscode.window.showWarningMessage(
        'Antigravity IDE çalışmıyor. Lütfen Antigravity\'yi başlatın ve yeniden bağlanmayı deneyin.',
        'Yeniden Bağlan'
      ).then((selection) => {
        if (selection === 'Yeniden Bağlan') {
          reconnect();
        }
      });
    }
  } catch (error) {
    console.error('Extension initialization error:', error);
    statusBarManager.updateError('Başlatma hatası');
  }
}

async function reconnect() {
  isInitialized = false;
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  
  vscode.window.showInformationMessage('Antigravity\'ye yeniden bağlanılıyor...');
  await initializeExtension();
}

async function refreshTokenUsage() {
  if (!isInitialized) {
    return;
  }

  statusBarManager.updateLoading();
  
  const usage = await apiClient.fetchTokenUsage();
  
  if (usage) {
    statusBarManager.update(usage);
    checkNotifications(usage);
    
    // Eğer detay paneli açıksa, onu da güncelle
    if (DetailPanel.currentPanel) {
      DetailPanel.currentPanel.update(usage);
    }
  } else {
    statusBarManager.updateError('Veri alınamadı');
  }
}

function showDetails() {
  const usage = statusBarManager.getCurrentUsage();
  if (usage) {
    DetailPanel.createOrShow(vscode.extensions.getExtension('antigravitytokenwatcher')!.extensionUri, usage);
  } else {
    vscode.window.showWarningMessage('Henüz token verisi yok. Yenilemeyi deneyin.');
  }
}

function startAutoRefresh() {
  // Eski interval'ı temizle
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  const config = vscode.workspace.getConfiguration('antigravitytokenwatcher');
  const intervalMinutes = config.get<number>('refreshInterval') || 5;
  const intervalMs = intervalMinutes * 60 * 1000;

  refreshInterval = setInterval(() => {
    refreshTokenUsage();
  }, intervalMs);
}

function checkNotifications(usage: TokenUsage) {
  const config = vscode.workspace.getConfiguration('antigravitytokenwatcher');
  const showNotifications = config.get<boolean>('showNotifications');
  
  if (!showNotifications) return;

  const percentage = usage.percentage;

  // %80 bildirim
  if (percentage >= NOTIFICATION_THRESHOLDS.EIGHTY && !notificationState.eightyPercent) {
    notificationState.eightyPercent = true;
    vscode.window.showWarningMessage(
      `Antigravity: Kullanımınız %80'e ulaştı (${usage.remaining.toLocaleString()} token kaldı)`,
      'Detayları Gör'
    ).then((selection) => {
      if (selection === 'Detayları Gör') {
        showDetails();
      }
    });
  }

  // %90 bildirim
  if (percentage >= NOTIFICATION_THRESHOLDS.NINETY && !notificationState.ninetyPercent) {
    notificationState.ninetyPercent = true;
    vscode.window.showWarningMessage(
      `⚠️ Antigravity: Kullanımınız %90'a ulaştı! Sadece ${usage.remaining.toLocaleString()} token kaldı`,
      'Detayları Gör'
    ).then((selection) => {
      if (selection === 'Detayları Gör') {
        showDetails();
      }
    });
  }

  // %95 bildirim
  if (percentage >= NOTIFICATION_THRESHOLDS.NINETY_FIVE && !notificationState.ninetyFivePercent) {
    notificationState.ninetyFivePercent = true;
    vscode.window.showErrorMessage(
      `🚨 Antigravity: Kullanımınız %95'e ulaştı! Acil: ${usage.remaining.toLocaleString()} token kaldı`,
      'Detayları Gör'
    ).then((selection) => {
      if (selection === 'Detayları Gör') {
        showDetails();
      }
    });
  }

  // %99 bildirim
  if (percentage >= NOTIFICATION_THRESHOLDS.NINETY_NINE && !notificationState.ninetyNinePercent) {
    notificationState.ninetyNinePercent = true;
    vscode.window.showErrorMessage(
      `⛔ Antigravity: Kullanımınız %99'a ulaştı! Sadece ${usage.remaining.toLocaleString()} token kaldı - RESET BEKLENİYOR!`,
      'Detayları Gör'
    ).then((selection) => {
      if (selection === 'Detayları Gör') {
        showDetails();
      }
    });
  }

  // Reset state when usage drops (after reset)
  if (percentage < 50) {
    notificationState = {
      eightyPercent: false,
      ninetyPercent: false,
      ninetyFivePercent: false,
      ninetyNinePercent: false
    };
  }
}

export function deactivate() {
  console.log('Antigravity Token Watcher devre dışı bırakıldı');
}
