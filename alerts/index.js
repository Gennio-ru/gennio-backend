import fetch from "node-fetch";

const LOKI_URL = process.env.LOKI_URL || "http://loki:3100";
const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;
const POLL_SEC = Number(process.env.POLL_SEC || 30);

if (!TG_TOKEN || !TG_CHAT_ID) {
  console.error("❌ TG_TOKEN or TG_CHAT_ID not set");
  process.exit(1);
}

let lastNs = null; // bigint | null

function nowNs() {
  return BigInt(Date.now()) * 1_000_000n;
}

// Берём и "Unhandled exception", и доменные "ModelJob failed"
async function queryErrors(startNs, endNs) {
  const query =
    '{container="/gennio-backend"} | json | (handled="false") or (msg="ModelJob failed")';

  const url = new URL("/loki/api/v1/query_range", LOKI_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("start", startNs.toString());
  url.searchParams.set("end", endNs.toString());
  url.searchParams.set("limit", "500");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Loki error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data && data.data && data.data.result) || [];
}

async function sendTelegram(html) {
  const res = await fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );

  if (!res.ok) {
    console.error("❌ Telegram error:", res.status, await res.text());
  }
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Возвращаем унифицированный объект с полем kind
function normalize(line, ts) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }

  const msg = obj?.msg;

  // 2) Твой доменный лог о провале задачи
  if (msg === "ModelJob failed") {
    return {
      kind: "job_failed",
      ts,
      service: obj.service || "backend",
      modelJobId: obj.modelJobId,
      userId: obj.userId,
      jobType: obj.type,
      tariffCode: obj.tariffCode,
      provider: obj.provider,
      errorCode: obj.errorCode ?? obj.error?.code,
      errorType: obj.errorType ?? obj.error?.type,
      status: obj.status,
      requestId: obj.requestId ?? obj.requestID,
      errorMessage: obj.errorMessage || obj.msg || "<no message>",
      stack: obj.stack,
    };
  }

  if (obj.status && obj.status < 500) return null;

  return {
    kind: "unhandled",
    ts,
    service: obj.service || "backend",
    method: obj.method,
    url: obj.url,
    status: obj.status,
    errorName: obj.errorName,
    errorMessage: obj.errorMessage || obj.msg || "<no message>",
    stack: obj.stack,
    requestId: obj.requestId,
  };
}

function formatUnhandled(entries, pollSec) {
  const s = entries[0];
  const lines = [];

  lines.push(
    `🚨 <b>Unhandled exception</b> (<b>${entries.length}</b> за ~${pollSec}с)`
  );
  lines.push("");
  if (s.service) lines.push(`Сервис: <code>${esc(s.service)}</code>`);
  if (s.method && s.url)
    lines.push(`Запрос: <code>${esc(s.method)} ${esc(s.url)}</code>`);
  if (s.status) lines.push(`Статус: <code>${esc(s.status)}</code>`);
  if (s.requestId) lines.push(`Request-Id: <code>${esc(s.requestId)}</code>`);
  lines.push("");
  lines.push(`<b>Ошибка:</b> <code>${esc(s.errorMessage)}</code>`);
  if (s.stack) {
    const short = String(s.stack).split("\n").slice(0, 6).join("\n");
    lines.push("");
    lines.push("<b>Stack (фрагмент):</b>");
    lines.push("<pre><code>" + esc(short) + "</code></pre>");
  }
  return lines.join("\n");
}

function formatJobFailed(entries, pollSec) {
  const s = entries[0];
  const lines = [];

  lines.push(
    `🛑 <b>ModelJob failed</b> (<b>${entries.length}</b> за ~${pollSec}с)`
  );
  lines.push("");
  if (s.service) lines.push(`Сервис: <code>${esc(s.service)}</code>`);
  if (s.modelJobId) lines.push(`Job ID: <code>${esc(s.modelJobId)}</code>`);
  if (s.userId) lines.push(`User: <code>${esc(s.userId)}</code>`);
  if (s.jobType) lines.push(`Тип: <code>${esc(s.jobType)}</code>`);
  if (s.tariffCode) lines.push(`Тариф: <code>${esc(s.tariffCode)}</code>`);
  if (s.provider) lines.push(`Провайдер: <code>${esc(s.provider)}</code>`);
  if (s.errorCode) lines.push(`Code: <code>${esc(s.errorCode)}</code>`);
  if (s.errorType) lines.push(`Type: <code>${esc(s.errorType)}</code>`);
  if (s.status) lines.push(`HTTP: <code>${esc(s.status)}</code>`);
  if (s.requestId) lines.push(`reqId: <code>${esc(s.requestId)}</code>`);
  lines.push("");
  lines.push(`<b>Ошибка:</b> <code>${esc(s.errorMessage)}</code>`);
  if (s.stack) {
    const short = String(s.stack).split("\n").slice(0, 6).join("\n");
    lines.push("");
    lines.push("<b>Stack (фрагмент):</b>");
    lines.push("<pre><code>" + esc(short) + "</code></pre>");
  }
  return lines.join("\n");
}

function formatTelegram(entries, pollSec) {
  if (!entries.length) return "";
  const kind = entries[0].kind;
  if (kind === "unhandled") return formatUnhandled(entries, pollSec);
  if (kind === "job_failed") return formatJobFailed(entries, pollSec);
  return "";
}

async function poll() {
  const end = nowNs();
  const windowNs = BigInt(POLL_SEC) * 1_000_000_000n;
  const start = lastNs && lastNs < end ? lastNs : end - windowNs;

  const streams = await queryErrors(start, end);

  const groups = new Map();
  let maxTs = lastNs || 0n;

  for (const stream of streams) {
    const values = stream.values || [];
    for (const [tsStr, line] of values) {
      const ts = BigInt(tsStr);
      if (lastNs && ts <= lastNs) continue;
      if (ts > maxTs) maxTs = ts;

      const n = normalize(line, ts);
      if (!n) continue;

      // Ключ группировки:
      // unhandled → kind+method+url+status+msg
      // job_failed → kind+provider+code+jobType+tariff
      let key;
      if (n.kind === "unhandled") {
        key = JSON.stringify({
          kind: n.kind,
          method: n.method,
          url: n.url,
          status: n.status,
          msg: n.errorMessage,
        });
      } else {
        key = JSON.stringify({
          kind: n.kind,
          provider: n.provider,
          code: n.errorCode,
          type: n.jobType,
          tariff: n.tariffCode,
        });
      }

      const arr = groups.get(key) || [];
      arr.push(n);
      groups.set(key, arr);
    }
  }

  if (maxTs > (lastNs || 0n)) {
    lastNs = maxTs;
  }

  if (!groups.size) return;

  for (const [, entries] of groups) {
    const html = formatTelegram(entries, POLL_SEC);
    if (html) await sendTelegram(html);
  }
}

async function loop() {
  console.log("✅ Alerts service started");
  console.log("LOKI_URL =", LOKI_URL);
  console.log("POLL_SEC =", POLL_SEC);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await poll();
    } catch (e) {
      console.error("❌ poll error:", e);
    }
    await new Promise((r) => setTimeout(r, POLL_SEC * 1000));
  }
}

loop();
