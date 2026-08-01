const UPSTREAM = process.env.GENLAYER_RPC_UPSTREAM || "https://rpc-bradbury.genlayer.com";
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 25_000;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const retryable = (status) => status === 429 || status >= 500;

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return response.status(405).json({ error: "method_not_allowed" });
  }
  let payload;
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: "invalid_json_rpc_request" });
  }
  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return response.status(400).json({ error: "invalid_json_rpc_request" });
  }
  let upstreamResponse;
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      upstreamResponse = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!retryable(upstreamResponse.status) || attempt === MAX_ATTEMPTS - 1) break;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS - 1) break;
    } finally {
      clearTimeout(timeout);
    }
    await delay(300 * (attempt + 1));
  }
  if (!upstreamResponse) {
    return response.status(502).json({
      error: "genlayer_upstream_unavailable",
      detail: lastError instanceof Error ? lastError.message : String(lastError),
    });
  }
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", upstreamResponse.headers.get("content-type") || "application/json");
  return response.status(upstreamResponse.status).send(await upstreamResponse.text());
}
