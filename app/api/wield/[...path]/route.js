export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const parts = params.path || [];
    const suffix = req.nextUrl.search || "";
    const upstream = `https://build.wield.xyz/${parts.join("/")}${suffix}`;
    const r = await fetch(upstream, {
      headers: { "x-api-key": process.env.WIELD_API_KEY || "" },
      next: { revalidate: 0 }
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const parts = params.path || [];
    const suffix = req.nextUrl.search || "";
    const upstream = `https://build.wield.xyz/${parts.join("/")}${suffix}`;
    const body = await req.text();
    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "x-api-key": process.env.WIELD_API_KEY || "",
        "content-type": req.headers.get("content-type") || "application/json"
      },
      body
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}
