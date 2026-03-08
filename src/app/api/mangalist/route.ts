import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get('query');
  const letter = searchParams.get('letter');
  const tag = searchParams.get('tag');

  try {
    const params = new URLSearchParams([
      ['includes[]', 'cover_art'],
      ['limit', '30'],
      ['contentRating[]', 'safe'],
      ['contentRating[]', 'suggestive']
    ]);

    if (query && letter) {
      params.append('title', `${letter} ${query}`);
      params.append('order[relevance]', 'desc');
    } else if (query) {
      params.append('title', query);
      params.append('order[relevance]', 'desc');
    } else if (letter) {
      params.append('title', letter);
      params.append('order[relevance]', 'desc');
    } else {
      params.append('hasAvailableChapters', 'true');
      params.append('order[latestUploadedChapter]', 'desc');
    }

    if (tag) {
      params.append('includedTags[]', tag);
    }
    
    const url = `https://api.mangadex.org/manga?${params.toString()}`;
    
    // Add User-Agent as required by some Manga API protections
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'GradeMasterOS-KomikReader/1.0',
        }
    });

    if (!response.ok) throw new Error(`MangaDex API error: ${response.status}`);
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('API /mangalist error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
