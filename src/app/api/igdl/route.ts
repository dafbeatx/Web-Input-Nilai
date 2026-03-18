import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is missing' }, { status: 400 });
  }

  try {
    // Dynamic require for CommonJS module
    const snapsave = require('@/lib/ig-downloader');
    const downloadedURL = await snapsave(url);
    
    return NextResponse.json({ url: downloadedURL });
  } catch (error: any) {
    console.error('Error in igdl route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
