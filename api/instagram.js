module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { username, maxId } = request.body;
  
  if (!username) {
    return response.status(400).json({ success: false, message: 'Username is required' });
  }

  // RapidAPI Credentials from Environment Variables
  // User needs to set RAPIDAPI_KEY in Vercel dashboard
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY_HERE';
  const RAPIDAPI_HOST = 'instagram120.p.rapidapi.com';

  const url = 'https://instagram120.p.rapidapi.com/api/instagram/posts';
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      },
      body: JSON.stringify({
        username: username,
        maxId: maxId || ""
      })
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `RapidAPI returned ${res.status}`);
    }

    const data = await res.json();
    
    return response.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error("Instagram API Error:", error);
    return response.status(500).json({ success: false, message: error.message });
  }
}
