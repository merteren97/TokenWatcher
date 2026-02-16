import { TokenUsage } from '../models/types';

export function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

export function formatTimeRemaining(resetTime: Date): string {
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();

    if (diff <= 0) {
        return 'Yenileniyor...';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours} saat ${minutes} dk`;
    }
    return `${minutes} dk`;
}

export function getStatusBarColor(percentage: number): string {
    if (percentage >= 95) return '#FF0000'; // Kırmızı
    if (percentage >= 90) return '#FF8C00'; // Turuncu
    if (percentage >= 80) return '#FFD700'; // Sarı
    return '#00FF00'; // Yeşil
}

export function getStatusBarIcon(percentage: number): string {
    if (percentage >= 95) return '$(error)';
    if (percentage >= 90) return '$(warning)';
    if (percentage >= 80) return '$(info)';
    return '$(check)';
}

export function generateWebviewContent(usage: TokenUsage): string {
    const percentage = usage.percentage;
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (percentage / 100) * circumference;

    let color = '#00FF00';
    if (percentage >= 95) color = '#FF0000';
    else if (percentage >= 90) color = '#FF8C00';
    else if (percentage >= 80) color = '#FFD700';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Antigravity Token Kullanımı</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        .progress-container {
            display: flex;
            justify-content: center;
            margin-bottom: 40px;
        }
        .progress-ring {
            transform: rotate(-90deg);
        }
        .progress-ring-circle {
            transition: stroke-dashoffset 0.35s;
            transform-origin: 50% 50%;
        }
        .percentage-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            font-weight: bold;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--vscode-input-background);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-label {
            font-size: 14px;
            opacity: 0.7;
            margin-bottom: 8px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
        }
        .plan-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .plan-free { background: #4CAF50; color: white; }
        .plan-pro { background: #2196F3; color: white; }
        .plan-ultra { background: #9C27B0; color: white; }
        .reset-info {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: var(--vscode-input-background);
            border-radius: 8px;
        }
        .reset-label {
            font-size: 14px;
            opacity: 0.7;
            margin-bottom: 8px;
        }
        .reset-value {
            font-size: 20px;
            font-weight: bold;
        }
        .models-container {
            margin-top: 30px;
        }
        .model-card {
            background: var(--vscode-input-background);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .model-name {
            font-weight: bold;
            font-size: 16px;
        }
        .model-stats {
            text-align: right;
        }
        .model-percentage {
            font-size: 18px;
            font-weight: bold;
            color: var(--vscode-charts-blue);
        }
        .model-reset {
            font-size: 12px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Antigravity Token Kullanımı</h1>
        
        <div class="progress-container">
            <svg class="progress-ring" width="200" height="200">
                <circle
                    class="progress-ring-circle"
                    stroke="#333"
                    stroke-width="12"
                    fill="transparent"
                    r="90"
                    cx="100"
                    cy="100"
                />
                <circle
                    class="progress-ring-circle"
                    stroke="${color}"
                    stroke-width="12"
                    fill="transparent"
                    r="90"
                    cx="100"
                    cy="100"
                    stroke-dasharray="${circumference} ${circumference}"
                    stroke-dashoffset="${offset}"
                    stroke-linecap="round"
                />
                <text x="100" y="100" text-anchor="middle" dy=".3em" fill="var(--vscode-editor-foreground)" font-size="36" font-weight="bold">${percentage.toFixed(1)}%</text>
            </svg>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Kullanılan</div>
                <div class="stat-value">${usage.used.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Toplam Limit</div>
                <div class="stat-value">${usage.total.toLocaleString()}</div>
            </div>
        </div>

        <div style="text-align: center;">
            <span class="plan-badge plan-${usage.plan}">${usage.plan.toUpperCase()}</span>
        </div>

        <div class="models-container">
            <h3>Model Kotaları</h3>
            ${usage.modelQuotas && usage.modelQuotas.length > 0 ? usage.modelQuotas.map(model => `
                <div class="model-card">
                    <div class="model-info">
                        <div class="model-name">${model.name}</div>
                        <div class="model-reset">Sıfırlanma: ${model.resetTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div class="model-stats">
                        <div class="model-percentage" style="color: ${getStatusBarColor(100 - model.remaining)}">
                            ${Math.round(model.remaining)}%
                        </div>
                        <div class="model-reset" style="font-size: 10px;">Kalan</div>
                    </div>
                </div>
            `).join('') : '<div style="text-align: center; opacity: 0.6;">Model bilgisi bulunamadı</div>'}
        </div>

        <div class="reset-info">
            <div class="reset-label">Sıradaki Reset</div>
            <div class="reset-value">${formatTimeRemaining(usage.resetTime)}</div>
            <div style="margin-top: 8px; font-size: 12px; opacity: 0.6;">
                ${usage.resetTime.toLocaleString('tr-TR')}
            </div>
        </div>
    </div>
</body>
</html>`;
}
