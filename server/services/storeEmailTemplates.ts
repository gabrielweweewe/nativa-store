import { supabase } from "../lib/supabase";

export type StoreEmailEvent =
  | "order_received"
  | "order_received_merchant"
  | "payment_approved";

export interface StoreEmailTemplate {
  event: StoreEmailEvent;
  name: string;
  subject: string;
  htmlContent: string;
  enabled: boolean;
  updatedAt: string;
}

interface StoreEmailTemplateRow {
  event: StoreEmailEvent;
  name: string;
  subject: string;
  html_content: string;
  enabled: boolean;
  updated_at: string;
}

function mapRow(row: StoreEmailTemplateRow): StoreEmailTemplate {
  return {
    event: row.event,
    name: row.name,
    subject: row.subject,
    htmlContent: row.html_content,
    enabled: row.enabled,
    updatedAt: row.updated_at,
  };
}

export async function listStoreEmailTemplates(): Promise<StoreEmailTemplate[]> {
  const { data, error } = await supabase
    .from("brevo_store_templates")
    .select("*")
    .order("event", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as StoreEmailTemplateRow[]).map(mapRow);
}

export async function getStoreEmailTemplate(
  event: StoreEmailEvent
): Promise<StoreEmailTemplate | null> {
  const { data, error } = await supabase
    .from("brevo_store_templates")
    .select("*")
    .eq("event", event)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as StoreEmailTemplateRow) : null;
}

export async function updateStoreEmailTemplate(input: {
  event: StoreEmailEvent;
  name?: string;
  subject: string;
  htmlContent: string;
  enabled?: boolean;
}): Promise<StoreEmailTemplate> {
  const update: Record<string, unknown> = {
    subject: input.subject.trim(),
    html_content: input.htmlContent,
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.enabled !== undefined) update.enabled = input.enabled;
  const { data, error } = await supabase
    .from("brevo_store_templates")
    .update(update)
    .eq("event", input.event)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as StoreEmailTemplateRow);
}
