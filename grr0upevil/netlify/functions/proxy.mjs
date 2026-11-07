export default async (request, context) => {
  const base = (Netlify.env.get("BACKEND_URL") || "").replace(/\/+$/, "");
  if (!base) return new Response("Backend is not configured. Set BACKEND_URL in Netlify environment variables.", { status: 503 });
  const incoming = new URL(request.url);
  const prefix = "/.netlify/functions/proxy";
  const forwardedPath = incoming.pathname.startsWith(prefix) ? incoming.pathname.slice(prefix.length) || "/" : incoming.pathname;
  const upstream = new URL(forwardedPath + incoming.search, base);
  const headers = new Headers(request.headers);
  headers.delete("host"); headers.delete("content-length"); headers.delete("connection");
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.slice(0, -1));
  const method = request.method.toUpperCase();
  const body = ["GET", "HEAD"].includes(method) ? undefined : await request.arrayBuffer();
  try {
    const response = await fetch(upstream, { method, headers, body, redirect: "manual" });
    const outHeaders = new Headers(response.headers);
    outHeaders.delete("content-encoding"); outHeaders.delete("content-length");
    return new Response(method === "HEAD" ? null : await response.arrayBuffer(), { status: response.status, headers: outHeaders });
  } catch (error) {
    console.error("Backend proxy error:", error);
    return new Response("The Group Evil backend is temporarily unavailable.", { status: 502 });
  }
};
