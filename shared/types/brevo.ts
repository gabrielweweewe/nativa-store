export type BrevoSubscriptionStatus = "subscribed" | "unsubscribed";
export type BrevoDeliveryKind = "transactional" | "campaign" | "test";

export interface BrevoSettingsInput {
  enabled: boolean;
  apiKey?: string;
  webhookToken?: string;
  defaultSenderId?: number | null;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
  replyTo?: string;
  defaultListId?: number | null;
  templateOrderReceived?: number | null;
  templatePaymentApproved?: number | null;
  templatePaymentFailed?: number | null;
  templatePaymentRefunded?: number | null;
  templateOrderProcessing?: number | null;
  templateOrderShipped?: number | null;
  templateOrderDelivered?: number | null;
}

export interface BrevoAdminStatus
  extends Omit<BrevoSettingsInput, "apiKey" | "webhookToken"> {
  hasApiKey: boolean;
  hasWebhookToken: boolean;
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  webhookConfigured: boolean;
  lastTestedAt: string | null;
  webhookUrl: string;
}

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface BrevoContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string | number | boolean | null>;
  listIds?: number[];
  unlinkListIds?: number[];
  updateEnabled?: boolean;
}

export interface BrevoTransactionalEmailInput {
  to: BrevoRecipient[];
  sender?: BrevoRecipient;
  replyTo?: BrevoRecipient;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  tags?: string[];
  sandbox?: boolean;
}

export interface BrevoCampaignInput {
  name: string;
  subject: string;
  sender?: BrevoRecipient;
  recipients?: {
    listIds: number[];
    exclusionListIds?: number[];
  };
  senderId?: number;
  listIds?: number[];
  htmlContent?: string;
  templateId?: number;
  replyTo?: string;
  tag?: string;
}

export interface BrevoCampaignScheduleInput {
  scheduledAt: string;
}

export interface BrevoNewsletterInput {
  email: string;
  consent: true;
  name?: string;
  source?: string;
  website?: string;
}

export interface BrevoWebhookEvent {
  event?: string;
  email?: string;
  id?: number | string;
  date?: string;
  ts?: number;
  ts_event?: number;
  ts_epoch?: number;
  "message-id"?: string;
  messageId?: string;
  campaignId?: number;
  camp_id?: number;
  [key: string]: unknown;
}
