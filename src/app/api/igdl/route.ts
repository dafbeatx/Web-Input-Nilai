import { NextRequest, NextResponse } from "next/server";
import { downloadInstagram } from "@/lib/ig-downloader";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL Instagram diperlukan" },
      { status: 400 }
    );
  }

  try {
    const results = await downloadInstagram(url);

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "Media tidak ditemukan. Pastikan post tidak private dan link valid." },
        { status: 404 }
      );
    }

    // Return the first media item for the current frontend implementation
    return NextResponse.json(results[0]);
  } catch (error: any) {
    console.error("Instagram download error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
