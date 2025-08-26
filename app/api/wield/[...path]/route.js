export const dynamic = "force-dynamic";

async function proxy(req, { params }, method) {
  try {
    const pathParts = params.path || [];
    const suffix = req.nextUrl.search || "";
    const upstream = `https://build.wield.xyz/${pathParts.join("/")}${suffix}`;

    const init = {
      method,
      headers: {
        "x-api-key": process.env.WIELD_API_KEY || ""
      },
      next: { revalidate: 0 }
    };

    if (method !== "GET") {
      init.headers["content-type"] = req.headers.get("content-type") || "application/json";
      init.body = await req.text();
    }

    const r = await fetch(upstream, init);
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}

export async function GET(req, ctx) { return proxy(req, ctx, "GET"); }
export async function POST(req, ctx) { return proxy(req, ctx, "POST"); }
