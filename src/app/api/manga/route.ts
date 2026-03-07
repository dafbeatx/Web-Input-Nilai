import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json({ success: false, message: 'Path required' }, { status: 400 });
  }
  
  try {
    const targetUrl = `https://api.mangadex.org/${path}`;
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GradeMasterOS/1.0'
      },
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`MangaDex API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Manga Proxy Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
