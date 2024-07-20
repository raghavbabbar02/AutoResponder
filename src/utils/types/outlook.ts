interface Credentials {
  accessToken: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

interface OutlookMessage {
  messageId: string;
  to: string;
  label: string;
  reply: string;
}

export { Credentials, TokenResponse, OutlookMessage };
