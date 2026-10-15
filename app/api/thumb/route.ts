import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "yt3.ggpht.com",
  "yt3.googleusercontent.com",
  "i.ytimg.com",
  "music.youtube.com",
];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(raw); }
  catch { return NextResponse.json({ error: "invalid url" }, { status: 400 }); }

  if (!ALLOWED_HOSTS.includes(parsed.hostname))
    return NextResponse.json({ error: "domain not allowed" }, { status: 403 });

  try {
    const res = await fetch(raw, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NexaaMusic/1.0)",
        Referer: "https://music.youtube.com/",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch failed", detail: e?.message }, { status: 502 });
  }
}
