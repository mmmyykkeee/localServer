import { syncEmailReplies } from "@/lib/email-sync";

const POLL_INTERVAL = 5 * 60 * 1000;

let lastPoll = 0;
let polling = false;

export async function GET() {
  if (polling) {
    return new Response(JSON.stringify({ ok: true, status: "already polling" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  if (now - lastPoll < POLL_INTERVAL) {
    const remaining = Math.ceil((POLL_INTERVAL - (now - lastPoll)) / 1000);
    return new Response(JSON.stringify({ ok: true, status: "skip", nextIn: remaining }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  polling = true;
  lastPoll = now;

  try {
    const result = await syncEmailReplies();
    polling = false;
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    polling = false;
    console.error("Auto-sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
