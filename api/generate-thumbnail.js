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
          content: `Create an image generation prompt for OpenAI's gpt-image-1 model to generate a complete church service thumbnail with text based on this sermon:

Title: ${sermonTitle}
Bible Verse: ${bibleVerse || 'N/A'}

CRITICAL REQUIREMENTS FOR gpt-image-1:
- Include the text "${sermonTitle}" prominently displayed on the image in large, bold, professional font
- Include the Bible verse "${bibleVerse || ''}" in smaller text above or below the title
- Include "Youghal Methodist Church" at the bottom in clean, legible font
- Professional photography style background (NOT cartoon/illustration)
- 16:9 horizontal aspect ratio
- Incorporate Methodist colors (red, navy blue) in design elements or text
- Warm, welcoming, inspirational church atmosphere
- Cinematic lighting on background
- High quality, photorealistic background
- Text should have drop shadow or outline for readability
- Background should complement the text without overwhelming it
- Font style: Bold, clean, professional (like Helvetica or similar)
- Text placement: Title center-bottom area, verse above it, church name at very bottom
- Ensure all text is spelled correctly and clearly readable

REMEMBER: gpt-image-1 is excellent at rendering text directly in images, so be explicit about including these text elements as part of the image generation, not as separate overlays.

Output ONLY the gpt-image-1 prompt, nothing else. No preamble, no explanation. Just the prompt text that will be sent to gpt-image-1.`
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API failed:', claudeResponse.status, errorText);
      console.log('Falling back to theme-based prompt');
      // Fall back to theme-based prompt if Claude fails
      var prompt = generatePrompt(theme, sermonTitle);
    } else {
      const claudeData = await claudeResponse.json();
      var prompt = claudeData.content[0].text.trim();
      console.log('Custom Claude prompt generated:', prompt.substring(0, 100) + '...');
    }

    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Call OpenAI gpt-image-1 API (latest model, better than DALL-E 3)
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1536x1024', // Landscape format - good for upscaling to 1920x1080
        quality: 'high' // Use high quality
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
    console.log('OpenAI gpt-image-1 response structure:', Object.keys(data));
    
    // Check if we have the expected data structure
    if (!data.data || !data.data[0]) {
      console.error('Unexpected response structure:', data);
      return res.status(500).json({ 
        error: 'Invalid response from OpenAI',
        details: 'Missing data array in response'
      });
    }
    
    // gpt-image-1 returns base64 by default, not URL
    const imageData = data.data[0];
    let imageUrl;
    
    if (imageData.url) {
      // If URL is provided (some configurations)
      imageUrl = imageData.url;
      console.log('Image URL found:', imageUrl);
    } else if (imageData.b64_json) {
      // If base64 is provided (default for gpt-image-1)
      const base64Data = imageData.b64_json;
      // Convert base64 to data URL
      imageUrl = `data:image/png;base64,${base64Data}`;
      console.log('Base64 image converted to data URL (length:', base64Data.length, ')');
    } else {
      console.error('No image data found in response:', imageData);
      return res.status(500).json({ 
        error: 'Invalid response from OpenAI',
        details: 'No URL or base64 data in response'
      });
    }

    // Return the image URL - 1536x1024 is optimal for upscaling to 1920x1080
    return res.status(200).json({
      imageUrl: imageUrl,
      originalSize: '1536x1024',
      targetSize: '1920x1080',
      note: 'Image generated at 1536x1024. Upscale to 1920x1080 in your editor for best quality.',
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