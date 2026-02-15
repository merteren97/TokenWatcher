import * as vscode from 'vscode';
import { TokenUsage } from '../models/types';
import { getStatusBarColor, getStatusBarIcon, formatNumber } from '../utils/helpers';
import { STATUS_BAR_PRIORITY } from '../utils/constants';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentUsage: TokenUsage | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      STATUS_BAR_PRIORITY
    );
    
    this.statusBarItem.command = 'antigravitytokenwatcher.showDetails';
    this.statusBarItem.tooltip = 'Antigravity Token Kullanımı - Detaylar için tıklayın';
    this.statusBarItem.show();
    
    this.updateLoading();
  }

  updateLoading() {
    this.statusBarItem.text = '$(sync~spin) AG: Yükleniyor...';
    this.statusBarItem.backgroundColor = undefined;
  }

  updateError(message: string) {
    this.statusBarItem.text = `$(error) AG: ${message}`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  update(usage: TokenUsage) {
    this.currentUsage = usage;
    
    const percentage = usage.percentage;
    const icon = getStatusBarIcon(percentage);
    const formattedRemaining = formatNumber(usage.remaining);
    
    this.statusBarItem.text = `${icon} AG: ${percentage.toFixed(0)}%`;
    
    // Arka plan rengi
    if (percentage >= 95) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (percentage >= 90) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else if (percentage >= 80) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.backgroundColor = undefined;
    }

    // Tooltip detaylı bilgi
    const resetTimeStr = usage.resetTime.toLocaleString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    this.statusBarItem.tooltip = new vscode.MarkdownString(
      `## Antigravity Token Kullanımı\n\n` +
      `- **Kullanılan:** ${usage.used.toLocaleString()} tokens\n` +
      `- **Toplam:** ${usage.total.toLocaleString()} tokens\n` +
      `- **Kalan:** ${usage.remaining.toLocaleString()} tokens (${percentage.toFixed(1)}%)\n` +
      `- **Plan:** ${usage.plan.toUpperCase()}\n` +
      `- **Reset Tarihi:** ${resetTimeStr}\n\n` +
      `_Detaylı bilgi için tıklayın_`
    );
    this.statusBarItem.tooltip.isTrusted = true;
  }

  getCurrentUsage(): TokenUsage | null {
    return this.currentUsage;
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
