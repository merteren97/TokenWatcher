import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TokenUsage, AntigravitySession } from '../models/types';
import { API_ENDPOINTS } from '../utils/constants';

export class AntigravityAPI {
  private client: AxiosInstance;
  private session: AntigravitySession | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_ENDPOINTS.ANITGRAVITY_BASE,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  setSession(session: AntigravitySession) {
    this.session = session;
    
    // Axios interceptor ile her isteğe cookie ekle
    this.client.interceptors.request.use((config) => {
      if (this.session?.cookies) {
        config.headers['Cookie'] = this.session.cookies;
      }
      return config;
    });
  }

  async fetchTokenUsage(): Promise<TokenUsage | null> {
    try {
      // Antigravity'nin dahili API endpoint'ini kullan
      // Not: Bu endpoint'ler değişebilir, gerçek uygulamada inspect edilmeli
      const response: AxiosResponse = await this.client.get('/api/v1/usage');
      
      if (response.data) {
        return this.parseUsageResponse(response.data);
      }
      
      return null;
    } catch (error) {
      console.error('Token kullanımı alınamadı:', error);
      
      // Fallback: Alternatif endpoint dene
      try {
        const response2 = await this.client.get('/api/v1/user/quota');
        if (response2.data) {
          return this.parseUsageResponse(response2.data);
        }
      } catch (error2) {
        console.error('Alternatif endpoint de başarısız:', error2);
      }
      
      return null;
    }
  }

  private parseUsageResponse(data: any): TokenUsage {
    // API yanıtını TokenUsage formatına çevir
    // Antigravity API yanıt formatına göre ayarlanmalı
    
    let used = 0;
    let total = 0;
    let resetTime = new Date();
    let plan: 'free' | 'pro' | 'ultra' = 'free';

    // Farklı API formatlarını dene
    if (data.usage) {
      used = data.usage.used || data.usage.tokens_used || 0;
      total = data.usage.total || data.usage.tokens_total || data.usage.limit || 1000000;
      
      if (data.usage.reset_time) {
        resetTime = new Date(data.usage.reset_time);
      } else if (data.usage.reset_at) {
        resetTime = new Date(data.usage.reset_at);
      } else {
        // Varsayılan: 5 saat sonra
        resetTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      }
    } else if (data.quota) {
      used = data.quota.used || 0;
      total = data.quota.total || data.quota.limit || 1000000;
      
      if (data.quota.reset_at) {
        resetTime = new Date(data.quota.reset_at);
      } else {
        resetTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      }
    }

    // Plan tespiti
    if (data.plan || data.subscription) {
      const planStr = (data.plan || data.subscription).toLowerCase();
      if (planStr.includes('ultra')) {
        plan = 'ultra';
      } else if (planStr.includes('pro')) {
        plan = 'pro';
      }
    }

    // Haftalık/5 saatlik limit kontrolü
    if (data.rate_limit_type === 'weekly' || data.refresh_interval === 'weekly') {
      // Haftalık reset - pazar gecesi varsayalım
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(0, 0, 0, 0);
      resetTime = nextSunday;
    }

    const remaining = Math.max(0, total - used);
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return {
      used,
      total,
      remaining,
      percentage,
      resetTime,
      plan
    };
  }

  // Manuel API Key ile auth
  async authenticateWithApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/user', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Session geçerliliğini kontrol et
  async validateSession(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/user');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
