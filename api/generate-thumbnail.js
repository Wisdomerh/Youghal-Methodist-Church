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

    // First, use Claude to analyze the sermon and create a custom DALL-E prompt
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Create a DALL-E prompt for a professional church service thumbnail background based on this sermon:

Title: ${sermonTitle}
Bible Verse: ${bibleVerse || 'N/A'}

Requirements:
- Professional photography style (NOT cartoon/illustration)
- 16:9 horizontal aspect ratio
- Suitable for text overlay (leave center/bottom area clear)
- Incorporate Methodist colors (red, navy blue) subtly
- Warm, welcoming, inspirational church atmosphere
- Cinematic lighting
- Must be appropriate for the sermon topic
- Photorealistic, high quality

Output ONLY the DALL-E prompt, nothing else. No preamble, no explanation. Just the prompt text.`
        }]
      })
    });

    if (!claudeResponse.ok) {
      console.error('Claude API failed, falling back to theme-based prompt');
      // Fall back to theme-based prompt if Claude fails
      var prompt = generatePrompt(theme, sermonTitle);
    } else {
      const claudeData = await claudeResponse.json();
      var prompt = claudeData.content[0].text.trim();
    }

    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

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

    // Get response text first to debug
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OpenAI API Error Status:', response.status);
      console.error('OpenAI API Error Response:', responseText);
      
      // Try to parse as JSON, but handle HTML errors
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { message: responseText.substring(0, 200) };
      }
      
      return res.status(500).json({ 
        error: 'Failed to generate thumbnail', 
        details: errorDetails,
        status: response.status
      });
    }

    const data = JSON.parse(responseText);
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
  const baseStyle = `Professional church service thumbnail background for Methodist church. High quality, photorealistic, clean composition suitable for text overlay. Cinematic lighting, warm and welcoming atmosphere. Colors: incorporate red and navy blue (Methodist colors) subtly. 16:9 aspect ratio, horizontal layout. Leave space in center/bottom for text overlay. Professional photography style, NOT cartoon or illustration.`;
  
  const themePrompts = {
    shepherd: `${baseStyle} Beautiful pastoral scene with rolling green hills and a shepherd caring for sheep during golden hour sunset. Warm, peaceful atmosphere with soft golden light. Gentle shepherd figure in distance tending flock. Professional nature photography. Serene and caring mood.`,
    
    faith: `${baseStyle} Majestic mountain peak at sunrise with dramatic rays of light breaking through clouds. Person standing on summit with arms raised in triumph and faith. Vast expansive sky, inspiring and hopeful. Professional landscape photography with cinematic drama.`,
    
    love: `${baseStyle} Warm golden sunlight radiating through stained glass window in church, casting colorful light. Community gathering in soft focus background. Compassionate, embracing atmosphere with rich reds and warm tones. Professional architectural photography.`,
    
    hope: `${baseStyle} Beautiful dawn breaking over horizon, darkness giving way to brilliant golden light. New beginning, fresh start with rays of hope piercing through morning mist. Peaceful landscape, professional sunrise photography. Inspiring and uplifting mood.`,
    
    worship: `${baseStyle} Intimate worship setting with soft stage lighting, warm spotlight beams, silhouettes of raised hands in worship. Musical instruments subtly visible. Reverent and joyful atmosphere with warm amber lighting. Professional concert photography style.`,
    
    cross: `${baseStyle} Simple wooden cross silhouetted against beautiful golden sunset sky over peaceful landscape. Contemplative mood, focus on sacrifice and salvation. Professional sunset photography with dramatic sky. Peaceful and reverent.`,
    
    peace: `${baseStyle} Perfectly calm water reflecting beautiful sky, serene landscape with gentle morning mist. White dove in graceful flight. Tranquil atmosphere with soft blues and whites. Professional nature photography. Still and restful mood.`,
    
    joy: `${baseStyle} Bright celebration scene with warm golden light, joyful atmosphere, people with raised hands in celebration. Vibrant warm colors, confetti of light particles. Jubilant and festive mood. Professional event photography.`,
    
    strength: `${baseStyle} Strong ancient oak tree with deep roots, standing firm against dramatic sky. Mountain landscape background. Resilient, steadfast feeling. Professional landscape photography with powerful composition.`,
    
    community: `${baseStyle} Diverse group of people holding hands in circle formation, unity and togetherness. Warm community gathering with supportive atmosphere. Soft warm lighting, professional group photography. Inclusive and welcoming.`
  };

  return themePrompts[theme] || themePrompts.cross;
}