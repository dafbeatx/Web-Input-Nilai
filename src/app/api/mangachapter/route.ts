import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Chapter ID is required' }, { status: 400 });
  }

  try {
    const url = `https://api.mangadex.org/at-home/server/${id}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'GradeMasterOS-KomikReader/1.0',
        }
    });

    if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('API /mangachapter error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
