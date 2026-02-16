export interface ModelQuota {
  name: string;
  remaining: number; // percentage 0-100
  resetTime: Date;
}

export interface TokenUsage {
  used: number;
  total: number;
  remaining: number;
  percentage: number;
  resetTime: Date;
  plan: 'free' | 'pro' | 'ultra';
  modelQuotas: ModelQuota[];
}

export interface AntigravitySession {
  cookies: string;
  userId?: string;
  userData?: {
    name: string;
    email: string;
    userStatusProtoBinaryBase64?: string;
  };
}

export interface NotificationState {
  eightyPercent: boolean;
  ninetyPercent: boolean;
  ninetyFivePercent: boolean;
  ninetyNinePercent: boolean;
}
