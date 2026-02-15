import * as https from 'https';
import { TokenUsage } from '../models/types';

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

    // Kullanılan kredileri hesapla
    const usedCredits = monthlyCredits - availableCredits;
    const percentage = monthlyCredits > 0 ? (usedCredits / monthlyCredits) * 100 : 0;

    // Reset zamanını bul (ilk modelin reset zamanını kullan)
    let resetTime = new Date();
    resetTime.setHours(resetTime.getHours() + 5); // Varsayılan 5 saat

    for (const model of models) {
      if (model.quotaInfo?.resetTime) {
        resetTime = new Date(model.quotaInfo.resetTime);
        break;
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
      plan
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
