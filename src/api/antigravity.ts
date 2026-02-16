import * as https from 'https';
import { TokenUsage, ModelQuota } from '../models/types';

export interface UserStatusResponse {
  userStatus?: {
    planStatus?: {
      planInfo?: {
        monthlyPromptCredits?: string;
      };
      availablePromptCredits?: string;
    };
    cascadeModelConfigData?: {
      clientModelConfigs?: Array<{
        label?: string;
        modelOrAlias?: {
          model?: string;
        };
        quotaInfo?: {
          remainingFraction?: number;
          resetTime?: string;
        };
      }>;
    };
  };
}

export class AntigravityAPI {
  private port: number = 0;
  private csrfToken: string = '';

  init(port: number, csrfToken: string) {
    this.port = port;
    this.csrfToken = csrfToken;
  }

  private request<T>(path: string, body: object): Promise<T> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const options: https.RequestOptions = {
        hostname: '127.0.0.1',
        port: this.port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Connect-Protocol-Version': '1',
          'X-Codeium-Csrf-Token': this.csrfToken
        },
        rejectUnauthorized: false,
        timeout: 5000
      };

      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(data);
      req.end();
    });
  }

  async fetchTokenUsage(): Promise<TokenUsage | null> {
    try {
      const data = await this.request<UserStatusResponse>(
        '/exa.language_server_pb.LanguageServerService/GetUserStatus',
        {
          metadata: {
            ideName: 'antigravity',
            extensionName: 'antigravity',
            locale: 'en'
          }
        }
      );

      return this.parseResponse(data);
    } catch (error) {
      console.error('Token usage fetch error:', error);
      return null;
    }
  }

  private parseResponse(data: UserStatusResponse): TokenUsage | null {
    const userStatus = data.userStatus;
    if (!userStatus) {
      return null;
    }

    const planStatus = userStatus.planStatus;
    const models = userStatus.cascadeModelConfigData?.clientModelConfigs || [];

    // Prompt credits bilgisi
    const monthlyCredits = planStatus?.planInfo?.monthlyPromptCredits
      ? parseInt(planStatus.planInfo.monthlyPromptCredits, 10)
      : 0;
    const availableCredits = planStatus?.availablePromptCredits
      ? parseInt(planStatus.availablePromptCredits, 10)
      : 0;

    // Eğer veriler alınamadıysa veya 0 gelirse, mantıksız %100 kullanım göstermemek için kontrol et
    if (monthlyCredits === 0 && availableCredits === 0) {
      return {
        used: 0,
        total: 0,
        remaining: 0,
        percentage: 0,
        resetTime: new Date(),
        plan: 'free',
        modelQuotas: []
      };
    }

    // Kullanılan kredileri hesapla
    const usedCredits = monthlyCredits - availableCredits;
    const percentage = monthlyCredits > 0 ? (usedCredits / monthlyCredits) * 100 : 0;

    // Reset zamanını bul (ilk modelin reset zamanını kullan)
    let resetTime = new Date();
    resetTime.setHours(resetTime.getHours() + 5); // Varsayılan 5 saat

    const modelQuotas: ModelQuota[] = [];

    for (const model of models) {
      if (model.quotaInfo?.resetTime) {
        const modelResetTime = new Date(model.quotaInfo.resetTime);

        // İlk geçerli reset zamanını ana reset zamanı olarak al (veya en yakın olanı)
        if (modelQuotas.length === 0) {
          resetTime = modelResetTime;
        }

        modelQuotas.push({
          name: model.label || model.modelOrAlias?.model || 'Unknown Model',
          remaining: (model.quotaInfo.remainingFraction || 0) * 100,
          resetTime: modelResetTime
        });
      }
    }

    // Plan tipi belirle
    let plan: 'free' | 'pro' | 'ultra' = 'free';
    if (monthlyCredits > 500) {
      plan = 'pro';
    }
    if (monthlyCredits > 5000) {
      plan = 'ultra';
    }

    return {
      used: usedCredits,
      total: monthlyCredits,
      remaining: availableCredits,
      percentage,
      resetTime,
      plan,
      modelQuotas
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.request('/exa.language_server_pb.LanguageServerService/GetUnleashData', {
        wrapper_data: {}
      });
      return true;
    } catch {
      return false;
    }
  }
}
