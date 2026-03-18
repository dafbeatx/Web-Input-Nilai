import axios from "axios";
import * as cheerio from "cheerio";

export interface IGMedia {
  url: string;
  type: "video" | "image";
  thumbnail?: string;
}

/**
 * Senior-level Instagram downloader implementation.
 * Uses Snapsave with a robust JS-packed decoder and redundant extraction methods.
 */
export async function downloadInstagram(url: string): Promise<IGMedia[]> {
  try {
    const params = new URLSearchParams();
    params.append("url", url);

    const { data: html } = await axios.post("https://snapsave.app/action.php?lang=en", params, {
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded",
        "origin": "https://snapsave.app",
        "referer": "https://snapsave.app/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      },
      timeout: 10000
    });

    if (!html || typeof html !== 'string') return [];

    let decodedHtml = "";

    // Pattern 1: eval(function(p,a,c,k,e,d)...)
    const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).*?\}\('(.*?)',(.*?),(.*?),(.*?)\.split\('\|'\),(.*?),(.*?)\)\)/);
    
    if (packedMatch) {
      decodedHtml = decodePacked(
        packedMatch[1],
        parseInt(packedMatch[2]),
        parseInt(packedMatch[3]),
        packedMatch[4].split('|'),
        parseInt(packedMatch[5]),
        JSON.parse(packedMatch[6] || "{}")
      );
    } else if (html.includes("var _0xc23e")) {
      // Pattern 2: var _0xc23e obfuscation - use robust regex extraction as fallback
      return extractUrls(html);
    } else {
      decodedHtml = html;
    }

    if (!decodedHtml) return extractUrls(html);

    const $ = cheerio.load(decodedHtml);
    const results: IGMedia[] = [];

    // Parse systematic download items
    $(".download-items").each((_, element) => {
      const thumb = $(element).find(".download-items__thumb img").attr("src");
      const btn = $(element).find(".download-items__btn a").first();
      let mUrl = btn.attr("href");

      if (mUrl) {
        if (mUrl.startsWith("/")) mUrl = "https://snapsave.app" + mUrl;
        const isVid = btn.text().toLowerCase().includes("video") || mUrl.includes(".mp4") || $(element).find(".play-icon").length > 0;
        results.push({ url: mUrl, type: isVid ? "video" : "image", thumbnail: thumb });
      }
    });

    if (results.length > 0) return results;

    // Last resort: extract any usable media URLs
    return extractUrls(decodedHtml);
  } catch (error) {
    console.error("Instagram download failed:", error);
    throw error;
  }
}

function extractUrls(html: string): IGMedia[] {
  const results: IGMedia[] = [];
  const unique = new Set<string>();
  
  // Look for scontent.cdninstagram.com or snapsave.app/download.php
  const regex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:cdninstagram\.com|snapsave\.app)\/[^\s"'`<>]+/gi;
  const matches = html.match(regex) || [];

  matches.forEach(m => {
    let u = m.replace(/\\/g, '').replace(/[;,\)\}\]].*$/, '');
    if (!unique.has(u) && (u.includes("scontent") || u.includes("download.php"))) {
      unique.add(u);
      results.push({ url: u, type: u.includes(".mp4") ? "video" : "image" });
    }
  });

  return results;
}

function decodePacked(p: string, a: number, c: number, k: string[], e: any, d: any) {
  const e_func = (c: any): string => (c < a ? "" : e_func(parseInt((c / a).toString()))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
  while (c--) if (k[c]) p = p.replace(new RegExp("\\b" + e_func(c) + "\\b", "g"), k[c]);
  return p;
}
