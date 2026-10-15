import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Proxy gambar dari Google/YouTube agar bisa dimuat di WebView APK
// tanpa masalah CORS atau referrer policy
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("missing url", { status: 400 });

  // Hanya izinkan domain gambar yang diketahui aman
  const allowed = [
    "lh3.googleusercontent.com",
    "yt3.ggpht.com",
    "yt3.googleusercontent.com",
    "i.ytimg.com",
    "music.youtube.com",
  ];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("invalid url", { status: 400 });
  }
  if (!allowed.some((d) => parsed.hostname.endsWith(d))) {
    return new NextResponse("domain not allowed", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
        "Referer": "https://music.youtube.com/",
      },
    });
    if (!res.ok) return new NextResponse("upstream error", { status: res.status });

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
