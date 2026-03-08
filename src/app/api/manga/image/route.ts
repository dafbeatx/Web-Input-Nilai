import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  // Allow MangaDex image URLs and At-Home network URLs
  const allowedDomains = [
    'https://uploads.mangadex.org/',
    'https://s2.mangadex.org/',
    '.mangadex.network/'
  ];
  
  const isAllowed = allowedDomains.some(domain => url.includes(domain));
  if (!isAllowed) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://mangadex.org/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
