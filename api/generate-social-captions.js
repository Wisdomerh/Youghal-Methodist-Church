// api/generate-social-captions.js
// Generate platform-specific social media captions

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sermonTitle, bibleVerses, date, keyPoints, eventType } = req.body;

    if (!sermonTitle) {
      return res.status(400).json({ error: 'Sermon title is required' });
    }

    // Call Claude API for social media captions
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Create social media captions for a church service/event:

Sermon/Event Title: ${sermonTitle}
Bible Verses: ${bibleVerses || 'N/A'}
Date: ${date}
Key Points: ${keyPoints || 'N/A'}
Event Type: ${eventType || 'Sunday Service'}

Generate 3 different captions:

1. INSTAGRAM CAPTION (150-200 characters):
- Engaging hook
- Relevant emojis
- 5-8 hashtags including #YoughalMethodist #MethodistIreland #Cork #Faith
- Warm and inviting tone
- Call to action

2. FACEBOOK POST (300-400 characters):
- More detailed than Instagram
- Welcoming message
- Include date/time
- Relevant emojis
- Mention "Youghal Methodist Church"

3. "GOING LIVE" ANNOUNCEMENT (Short, 100 characters):
- Urgent, exciting tone
- "Join us LIVE in 15 minutes!"
- Include streaming link placeholder
- Relevant emojis

Format as plain text (no markdown). Separate each caption with "---"`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API Error:', error);
      return res.status(500).json({ error: 'Failed to generate captions', details: error });
    }

    const data = await response.json();
    const generatedText = data.content[0].text;

    // Parse the captions
    const captions = generatedText.split('---').map(c => c.trim());

    return res.status(200).json({
      instagram: captions[0] || generatedText,
      facebook: captions[1] || generatedText,
      goingLive: captions[2] || generatedText
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}