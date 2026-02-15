export interface TokenUsage {
  used: number;
  total: number;
  remaining: number;
  percentage: number;
  resetTime: Date;
  plan: 'free' | 'pro' | 'ultra';
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
