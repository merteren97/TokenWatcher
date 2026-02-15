import * as vscode from 'vscode';
import { TokenUsage } from '../models/types';
import { generateWebviewContent } from '../utils/helpers';

export class DetailPanel {
  public static currentPanel: DetailPanel | undefined;
  public static readonly viewType = 'antigravitytokenwatcher.details';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, usage: TokenUsage) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // Eğer panel zaten açıksa, onu kullan
    if (DetailPanel.currentPanel) {
      DetailPanel.currentPanel.panel.reveal(column);
      DetailPanel.currentPanel.update(usage);
      return;
    }

    // Yeni panel oluştur
    const panel = vscode.window.createWebviewPanel(
      DetailPanel.viewType,
      'Antigravity Token Kullanımı',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    DetailPanel.currentPanel = new DetailPanel(panel, extensionUri, usage);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    usage: TokenUsage
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    // İçeriği ayarla
    this.update(usage);

    // Panel kapatıldığında temizlik yap
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public update(usage: TokenUsage) {
    this.panel.webview.html = generateWebviewContent(usage);
    
    // Başlığı güncelle
    this.panel.title = `AG: ${usage.percentage.toFixed(0)}% Kullanıldı`;
  }

  public dispose() {
    DetailPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
