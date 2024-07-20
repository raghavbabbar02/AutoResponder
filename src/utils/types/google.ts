import { gmail_v1 } from "googleapis";

interface Credentials {
  client_id: string;
  project_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_secret: string;
  redirect_uris: string[];
}

interface RequiredEmailHeaders {
  sender?: string;
  subject?: string;
  messageId?: string;
}

interface GmailMessageRequestBody {
  raw: string;
  threadId: string;
}

interface GmailMessage {
  message: GmailMessageRequestBody;
  messageId: string;
  label: gmail_v1.Schema$Label;
}

export { Credentials, RequiredEmailHeaders, GmailMessage };
