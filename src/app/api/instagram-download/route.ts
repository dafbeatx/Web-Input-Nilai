import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL Instagram diperlukan" },
        { status: 400 }
      );
    }

    // Validate Instagram URL
    const igRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[\w-]+/i;
    if (!igRegex.test(url)) {
      return NextResponse.json(
        { error: "URL Instagram tidak valid" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server belum dikonfigurasi. Hubungi administrator." },
        { status: 500 }
      );
    }

    // Call RapidAPI Instagram downloader
    const response = await fetch(
      "https://social-media-video-downloader.p.rapidapi.com/smvd/get/instagram",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("RapidAPI error:", response.status, errText);
      return NextResponse.json(
        { error: "Gagal mengambil media. Coba lagi nanti atau periksa link." },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Parse the response — structure varies by API
    // Common patterns: data.links, data.url, data.media, etc.
    let mediaUrl = "";
    let mediaType: "video" | "image" = "video";
    let thumbnail = "";

    if (data.links && Array.isArray(data.links) && data.links.length > 0) {
      // Find highest quality link
      const videoLink = data.links.find(
        (l: any) => l.quality === "hd" || l.quality === "sd" || l.link
      );
      mediaUrl = videoLink?.link || data.links[0]?.link || "";
      mediaType = videoLink?.type === "image" ? "image" : "video";
    } else if (data.url) {
      mediaUrl = data.url;
    } else if (data.media) {
      mediaUrl = data.media;
    } else if (data.picture) {
      mediaUrl = data.picture;
      mediaType = "image";
    }

    if (data.thumbnail || data.picture) {
      thumbnail = data.thumbnail || data.picture;
    }

    // Detect type from URL if not set
    if (mediaUrl) {
      const lowerUrl = mediaUrl.toLowerCase();
      if (lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".png") || lowerUrl.includes(".webp")) {
        mediaType = "image";
      }
    }

    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Media tidak ditemukan. Pastikan post tidak private." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      url: mediaUrl,
      type: mediaType,
      thumbnail,
    });
  } catch (error: any) {
    console.error("Instagram download error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
