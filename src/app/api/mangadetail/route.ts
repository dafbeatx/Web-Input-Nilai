import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Manga ID is required' }, { status: 400 });
  }

  try {
    const url = `https://api.mangadex.org/manga/${id}/feed?translatedLanguage[]=en&translatedLanguage[]=id&order[chapter]=desc&limit=100`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'GradeMasterOS-KomikReader/1.0',
        }
    });

    if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('API /mangadetail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
