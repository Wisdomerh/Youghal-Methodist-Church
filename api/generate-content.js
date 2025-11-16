// api/generate-content.js
// Vercel Serverless Function for AI Content Generation

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sermonTitle, bibleVerses, pastorName, keyPoints, worshipSongs, date } = req.body;

    // Validate required fields
    if (!sermonTitle || !bibleVerses) {
      return res.status(400).json({ error: 'Sermon title and Bible verses are required' });
    }

    // Call Claude API for enhanced description generation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Create an engaging YouTube description for a church service with these details:

Sermon Title: ${sermonTitle}
Bible Verses: ${bibleVerses}
Pastor/Speaker: ${pastorName || 'Our Ministry Team'}
Date: ${date}
Key Points: ${keyPoints || 'N/A'}
Worship Songs: ${worshipSongs || 'N/A'}

Requirements:
- Make it warm, welcoming, and engaging
- Include relevant emojis
- Add clear sections with timestamps placeholder
- Include call-to-actions (subscribe, comment, share)
- Add relevant hashtags
- Mention "Youghal Methodist Church - Part of the Methodist Church in Ireland"
- Keep it under 5000 characters
- Make it feel authentic and pastoral, not corporate`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API Error:', error);
      return res.status(500).json({ error: 'Failed to generate content', details: error });
    }

    const data = await response.json();
    const generatedDescription = data.content[0].text;

    // Determine theme for thumbnail
    const theme = determineTheme(sermonTitle, keyPoints);

    return res.status(200).json({
      description: generatedDescription,
      thumbnail: {
        title: sermonTitle,
        verse: bibleVerses.split(/[,;]/)[0].trim(),
        theme: theme
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Helper function to determine visual theme
function determineTheme(title, points) {
  const text = (title + ' ' + (points || '')).toLowerCase();
  
  if (text.includes('shepherd') || text.includes('sheep')) return 'shepherd';
  if (text.includes('faith') || text.includes('trust') || text.includes('believe')) return 'faith';
  if (text.includes('love') || text.includes('grace') || text.includes('mercy')) return 'love';
  if (text.includes('hope') || text.includes('light') || text.includes('dawn')) return 'hope';
  if (text.includes('prayer') || text.includes('worship') || text.includes('praise')) return 'worship';
  if (text.includes('cross') || text.includes('sacrifice') || text.includes('salvation')) return 'cross';
  if (text.includes('peace') || text.includes('rest') || text.includes('calm')) return 'peace';
  if (text.includes('joy') || text.includes('celebrate') || text.includes('rejoice')) return 'joy';
  if (text.includes('strength') || text.includes('courage') || text.includes('power')) return 'strength';
  if (text.includes('family') || text.includes('community') || text.includes('together')) return 'community';
  
  return 'cross'; // default
}