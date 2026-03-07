module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { username, maxId } = request.body;

  if (!username) {
    return response.status(400).json({ success: false, message: 'Username is required' });
  }

  // RapidAPI Key provided by user
  const apiKey = process.env.RAPIDAPI_KEY || 'dca1ab0243msheb72e2a95849ef8p1819c0jsnfe21c70ec1c2';

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
    
    if (!res.ok) {
      return response.status(res.status).json({
        success: false,
        message: result.message || 'RapidAPI Error',
        data: result
      });
    }

    return response.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Instagram Proxy Error:', error);
    return response.status(500).json({ success: false, message: error.message });
  }
}
