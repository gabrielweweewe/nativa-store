import type { BrevoWebhookEvent } from "@shared/types/brevo";
import { Router } from "express";
import {
  bearerToken,
  brevoEventKey,
  tokensMatch,
} from "../lib/brevoWebhookSecurity";
import { supabase } from "../lib/supabase";
import { getBrevoWebhookToken } from "../services/brevo";

const router = Router();

function eventDate(event: BrevoWebhookEvent): string {
  const milliseconds = Number(event.ts_epoch);
  if (Number.isFinite(milliseconds) && milliseconds > 0) {
    return new Date(milliseconds).toISOString();
  }
  const seconds = Number(event.ts_event ?? event.ts);
  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000).toISOString();
  }
  if (typeof event.date === "string" && !Number.isNaN(Date.parse(event.date))) {
    return new Date(event.date).toISOString();
  }
  return new Date().toISOString();
}

function deliveryUpdate(
  eventType: string,
  at: string
): Record<string, unknown> {
  const normalized = eventType.toLowerCase();
  const update: Record<string, unknown> = {
    status: normalized,
    updated_at: new Date().toISOString(),
  };
  if (normalized === "delivered") update.delivered_at = at;
  if (normalized === "opened" || normalized === "unique_opened")
    update.opened_at = at;
  if (normalized === "click" || normalized === "clicked")
    update.clicked_at = at;
  if (
    [
      "soft_bounce",
      "hard_bounce",
      "blocked",
      "invalid",
      "error",
      "complaint",
      "spam",
    ].includes(normalized)
  ) {
    update.failed_at = at;
  }
  return update;
}

export async function persistBrevoEvent(
  event: BrevoWebhookEvent
): Promise<"created" | "duplicate"> {
  const eventType = String(event.event ?? "unknown").toLowerCase();
  const messageId =
    String(event["message-id"] ?? event.messageId ?? "") || null;
  const campaignValue = event.campaignId ?? event.camp_id;
  const campaignId = Number.isInteger(Number(campaignValue))
    ? Number(campaignValue)
    : null;
  const email =
    typeof event.email === "string" ? event.email.trim().toLowerCase() : null;
  const at = eventDate(event);
  const { data, error } = await supabase
    .from("brevo_email_events")
    .upsert(
      {
        event_key: brevoEventKey(event),
        event_type: eventType,
        message_id: messageId,
        campaign_id: campaignId,
        email,
        event_at: at,
        payload: event,
      },
      { onConflict: "event_key", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const result = data ? "created" : "duplicate";

  let deliveryQuery = supabase
    .from("brevo_email_deliveries")
    .update(deliveryUpdate(eventType, at));
  if (messageId) {
    deliveryQuery = deliveryQuery.eq("message_id", messageId);
  } else if (campaignId !== null) {
    deliveryQuery = deliveryQuery.eq("campaign_id", campaignId);
  } else {
    deliveryQuery = deliveryQuery.eq("recipient_email", email ?? "");
  }
  if (email && messageId) {
    deliveryQuery = deliveryQuery.eq("recipient_email", email);
  }
  const { error: deliveryError } = await deliveryQuery;
  if (deliveryError) throw new Error(deliveryError.message);

  if (
    email &&
    [
      "unsubscribed",
      "unsubscribe",
      "hard_bounce",
      "hardbounce",
      "complaint",
      "spam",
      "blocked",
      "invalid",
    ].includes(eventType)
  ) {
    const { error: subscriptionError } = await supabase
      .from("marketing_subscriptions")
      .update({
        status: "unsubscribed",
        unsubscribed_at: at,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
    if (subscriptionError) throw new Error(subscriptionError.message);
  }
  return result;
}

router.post("/", async (req, res) => {
  try {
    const expected = await getBrevoWebhookToken();
    const candidate = bearerToken(req.header("authorization"));
    if (!candidate || !tokensMatch(candidate, expected)) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const events = Array.isArray(req.body) ? req.body : [req.body];
    let created = 0;
    for (const event of events) {
      if (
        !event ||
        typeof event !== "object" ||
        typeof (event as BrevoWebhookEvent).event !== "string"
      ) {
        continue;
      }
      if ((await persistBrevoEvent(event as BrevoWebhookEvent)) === "created") {
        created++;
      }
    }
    res.status(200).json({ received: true, created });
  } catch (error) {
    console.error("Erro no webhook Brevo:", error);
    res.status(500).json({ error: "Falha ao processar notificação" });
  }
});

export default router;
