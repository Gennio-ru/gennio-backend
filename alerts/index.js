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

async function queryErrors(startNs, endNs) {
  // Берём только логи нашего фильтра: msg = "Unhandled exception"
  const query =
    '{container="/gennio-backend",level="error"} |= "Unhandled exception"';

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

async function sendTelegram(text) {
  const res = await fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    }
  );

  if (!res.ok) {
    console.error("❌ Telegram error:", res.status, await res.text());
  }
}

// Парсим строку Loki → берём только наши логи фильтра
function normalizeUnhandled(line, ts) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }

  if (obj.msg !== "Unhandled exception") {
    return null;
  }

  return {
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

function formatTelegram(entries, pollSec) {
  const sample = entries[0];

  const lines = [];

  lines.push(
    `🚨 *Unhandled exception* (${entries.length} раз за ~${pollSec}с)`
  );
  lines.push("");
  lines.push(`Сервис: \`${sample.service}\``);

  if (sample.method && sample.url) {
    lines.push(`Запрос: \`${sample.method} ${sample.url}\``);
  }

  if (sample.status) {
    lines.push(`Статус: \`${sample.status}\``);
  }

  if (sample.requestId) {
    lines.push(`Request-Id: \`${sample.requestId}\``);
  }

  lines.push("");
  lines.push(`*Ошибка:* \`${sample.errorMessage}\``);

  if (sample.stack) {
    const shortStack = String(sample.stack).split("\n").slice(0, 6).join("\n");

    lines.push("");
    lines.push("*Stack (фрагмент):*");
    lines.push("```");
    lines.push(shortStack);
    lines.push("```");
  }

  return lines.join("\n");
}

async function poll() {
  const end = nowNs();
  const windowNs = BigInt(POLL_SEC) * 1_000_000_000n;
  const start = lastNs && lastNs < end ? lastNs : end - windowNs;

  const streams = await queryErrors(start, end);

  console.log("!!!", streams);

  const groups = new Map();
  let maxTs = lastNs || 0n;

  for (const stream of streams) {
    const values = stream.values || [];
    for (const [tsStr, line] of values) {
      const ts = BigInt(tsStr);
      if (lastNs && ts <= lastNs) continue;
      if (ts > maxTs) maxTs = ts;

      const normalized = normalizeUnhandled(line, ts);
      if (!normalized) continue;

      // Ключ для группировки одинаковых ошибок
      const key = JSON.stringify({
        msg: normalized.errorMessage,
        method: normalized.method,
        url: normalized.url,
        status: normalized.status,
      });

      const arr = groups.get(key) || [];
      arr.push(normalized);
      groups.set(key, arr);
    }
  }

  if (maxTs > (lastNs || 0n)) {
    lastNs = maxTs;
  }

  if (!groups.size) return;

  for (const [, entries] of groups.entries()) {
    const text = formatTelegram(entries, POLL_SEC);
    await sendTelegram(text);
  }
}

async function loop() {
  console.log("✅ Alerts service started");
  console.log("LOKI_URL =", LOKI_URL);
  console.log("POLL_SEC =", POLL_SEC);

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
