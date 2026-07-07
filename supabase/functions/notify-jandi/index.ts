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

function buildJandiBody(payload: NotifyPayload) {
  const typeLabel = payload.type === "deadline" ? "마감 알림" : payload.type === "comment" ? "새 피드백" : "확인요망";
  const lines = [
    `[업무보드] ${typeLabel}`,
    payload.projectTitle ? `프로젝트: ${payload.projectTitle}` : null,
    payload.recipientName ? `대상자: ${payload.recipientName}` : null,
    payload.senderName ? `요청자: ${payload.senderName}` : null,
    payload.dueDate ? `만기일: ${payload.dueDate}` : null,
    payload.message ? `내용: ${payload.message}` : null,
    payload.pageUrl ? `바로가기: ${payload.pageUrl}` : null,
  ].filter(Boolean);

  return lines.join("\n");
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

  const webhookUrl = Deno.env.get("JANDI_WEBHOOK_URL");
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: "JANDI_WEBHOOK_URL is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = (await req.json()) as NotifyPayload;
  const body = buildJandiBody(payload);

  const jandiResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.tosslab.jandi-v2+json",
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
