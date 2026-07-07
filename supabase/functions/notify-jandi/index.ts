const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotifyPayload = {
  projectTitle?: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  dueDate?: string;
  pageUrl?: string;
  type?: "confirm_request" | "deadline" | "comment";
};

function parseWebhookMap() {
  const raw = Deno.env.get("JANDI_WEBHOOK_URLS");
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function normalizeName(name?: string) {
  return String(name || "").trim();
}

function pickWebhookUrl(payload: NotifyPayload) {
  const fallbackUrl = Deno.env.get("JANDI_WEBHOOK_URL") || "";
  const webhookMap = parseWebhookMap();
  const recipientName = normalizeName(payload.recipientName);

  if (!recipientName || recipientName === "전체") return fallbackUrl;

  return webhookMap[recipientName] || fallbackUrl;
}

function buildJandiBody(payload: NotifyPayload) {
  const typeLabel =
    payload.type === "deadline"
      ? "마감 알림"
      : payload.type === "comment"
        ? "새 피드백"
        : "확인요망";

  return [
    `[업무보드] ${typeLabel}`,
    payload.projectTitle ? `프로젝트: ${payload.projectTitle}` : null,
    payload.recipientName ? `수신자: ${payload.recipientName}` : null,
    payload.senderName ? `보낸 사람: ${payload.senderName}` : null,
    payload.dueDate ? `만기일: ${payload.dueDate}` : null,
    payload.message ? `내용: ${payload.message}` : null,
    payload.pageUrl ? `바로가기: ${payload.pageUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = (await req.json()) as NotifyPayload;
  const webhookUrl = pickWebhookUrl(payload);
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: "Jandi webhook is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = buildJandiBody(payload);

  const jandiResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Accept: "application/vnd.tosslab.jandi-v2+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!jandiResponse.ok) {
    const errorText = await jandiResponse.text();
    return new Response(JSON.stringify({ error: "Jandi notification failed", detail: errorText }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
