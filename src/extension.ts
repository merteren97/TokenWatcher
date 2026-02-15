import * as vscode from 'vscode';
import { AntigravityAPI } from './api/antigravity';
import { CookieExtractor } from './auth/cookieExtractor';
import { StatusBarManager } from './ui/statusBar';
import { DetailPanel } from './ui/webviewPanel';
import { TokenUsage, NotificationState } from './models/types';
import { REFRESH_INTERVAL_MS, NOTIFICATION_THRESHOLDS } from './utils/constants';

let statusBarManager: StatusBarManager;
let apiClient: AntigravityAPI;
let cookieExtractor: CookieExtractor;
let refreshInterval: NodeJS.Timeout | null = null;
let notificationState: NotificationState = {
  eightyPercent: false,
  ninetyPercent: false,
  ninetyFivePercent: false,
  ninetyNinePercent: false
};

export async function activate(context: vscode.ExtensionContext) {
  console.log('Antigravity Token Watcher aktif edildi');

  // Servisleri başlat
  statusBarManager = new StatusBarManager();
  apiClient = new AntigravityAPI();
  cookieExtractor = new CookieExtractor();

  // Komutları kaydet
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravitytokenwatcher.refresh', refreshTokenUsage),
    vscode.commands.registerCommand('antigravitytokenwatcher.showDetails', showDetails),
    vscode.commands.registerCommand('antigravitytokenwatcher.setApiKey', setApiKey)
  );

  // Cookie veya API key ile oturum başlat
  await initializeSession();

  // İlk veri çekme
  await refreshTokenUsage();

  // Otomatik yenileme başlat
  startAutoRefresh();

  // Configuration değişikliklerini dinle
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('antigravitytokenwatcher.refreshInterval')) {
        startAutoRefresh();
      }
    })
  );

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

async function initializeSession() {
  const config = vscode.workspace.getConfiguration('antigravitytokenwatcher');
  const apiKey = config.get<string>('apiKey');

  // Önce API key dene
  if (apiKey && apiKey.length > 0) {
    const isValid = await apiClient.authenticateWithApiKey(apiKey);
    if (isValid) {
      vscode.window.showInformationMessage('Antigravity: API Key ile giriş yapıldı');
      return;
    }
  }

  // Cookie ile dene
  const session = await cookieExtractor.extractSession();
  if (session) {
    apiClient.setSession(session);
    const isValid = await apiClient.validateSession();
    if (isValid) {
      vscode.window.showInformationMessage('Antigravity: Chrome/Edge oturumu bulundu');
      return;
    }
  }

  // Fallback: Local storage'dan dene
  const session2 = await cookieExtractor.extractFromLocalStorage();
  if (session2) {
    apiClient.setSession(session2);
    const isValid = await apiClient.validateSession();
    if (isValid) {
      return;
    }
  }

  // Hiçbiri çalışmadı
  statusBarManager.updateError('Oturum bulunamadı');
  vscode.window.showWarningMessage(
    'Antigravity: Chrome/Edge oturumu bulunamadı. Ayarlardan API Key ekleyebilirsiniz.',
    'API Key Ayarla'
  ).then((selection) => {
    if (selection === 'API Key Ayarla') {
      setApiKey();
    }
  });
}

async function refreshTokenUsage() {
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

async function setApiKey() {
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Antigravity API Key\'inizi girin',
    password: true,
    ignoreFocusOut: true,
    placeHolder: 'API Key'
  });

  if (apiKey) {
    const config = vscode.workspace.getConfiguration('antigravitytokenwatcher');
    await config.update('apiKey', apiKey, true);
    
    const isValid = await apiClient.authenticateWithApiKey(apiKey);
    if (isValid) {
      vscode.window.showInformationMessage('Antigravity: API Key kaydedildi ve doğrulandı');
      await refreshTokenUsage();
    } else {
      vscode.window.showErrorMessage('Antigravity: API Key geçersiz');
    }
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
