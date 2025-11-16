// api/generate-thumbnail.js
// Vercel Serverless Function for AI Thumbnail Generation

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sermonTitle, bibleVerse, theme } = req.body;

    if (!sermonTitle) {
      return res.status(400).json({ error: 'Sermon title is required' });
    }

    // Create theme-specific prompt for DALL-E
    const prompt = generatePrompt(theme, sermonTitle);

    // Call OpenAI DALL-E API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024', // YouTube thumbnail ratio
        quality: 'standard',
        style: 'natural'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return res.status(500).json({ error: 'Failed to generate thumbnail', details: error });
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    // Return the image URL and text overlay data
    return res.status(200).json({
      imageUrl: imageUrl,
      overlay: {
        title: sermonTitle,
        verse: bibleVerse,
        church: 'Youghal Methodist Church'
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Generate theme-specific prompts for DALL-E
function generatePrompt(theme, sermonTitle) {
  const baseStyle = 'Professional, warm, inspirational church service background. Clean, not cluttered. Suitable for text overlay. Methodist church aesthetic. Soft lighting, welcoming atmosphere.';
  
  const themePrompts = {
    shepherd: `${baseStyle} Rolling green hills with a shepherd caring for sheep at golden hour. Peaceful pastoral scene. Gentle, caring atmosphere.`,
    
    faith: `${baseStyle} Person standing on mountain peak at sunrise, arms raised in trust and faith. Vast sky, rays of light breaking through clouds. Hopeful and uplifting.`,
    
    love: `${baseStyle} Warm golden light radiating outward, hearts and community gathering together. Compassionate, embracing atmosphere. Red and warm tones.`,
    
    hope: `${baseStyle} Dawn breaking over horizon, darkness giving way to brilliant light. New beginning, fresh start. Rays of hope piercing through.`,
    
    worship: `${baseStyle} Hands raised in worship, soft stage lights, intimate worship atmosphere. Musical instruments subtly in background. Reverent and joyful.`,
    
    cross: `${baseStyle} Simple wooden cross silhouetted against beautiful sunset sky. Peaceful, contemplative. Focus on sacrifice and salvation.`,
    
    peace: `${baseStyle} Calm water reflecting sky, serene landscape, dove in flight. Tranquil atmosphere, soft blues and whites. Still and restful.`,
    
    joy: `${baseStyle} Bright celebration, people with raised hands in joy, vibrant warm colors, confetti of light. Jubilant and festive church atmosphere.`,
    
    strength: `${baseStyle} Strong oak tree standing firm in wind, roots deep. Mountain landscape. Resilient, steadfast. Powerful but peaceful.`,
    
    community: `${baseStyle} Diverse group of people holding hands in circle, unity and togetherness. Warm community gathering, supportive atmosphere.`
  };

  return themePrompts[theme] || themePrompts.cross;
}