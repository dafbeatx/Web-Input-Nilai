module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { username, maxId } = request.body;

  if (!username) {
    return response.status(400).json({ success: false, message: 'Username is required' });
  }

  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return response.status(500).json({ 
      success: false, 
      message: 'Server configuration error: RAPIDAPI_KEY is missing' 
    });
  }

  const url = 'https://instagram120.p.rapidapi.com/api/instagram/posts';
  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'instagram120.p.rapidapi.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      maxId: maxId || ""
    })
  };

  try {
    const res = await fetch(url, options);
    const result = await res.json();
    return response.status(res.status).json(result);
  } catch (error) {
    console.error('Instagram Proxy Error:', error);
    return response.status(500).json({ success: false, message: error.message });
  }
}
