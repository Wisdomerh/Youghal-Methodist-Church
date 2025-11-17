// api/generate-thumbnail.js
// Vercel Serverless Function for AI Thumbnail Generation (with text inside the image)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sermonTitle, bibleVerse, theme, includeChurchName } = req.body;

    if (!sermonTitle) {
      return res.status(400).json({ error: 'Sermon title is required' });
    }

    // -------- 1) Generate SCENE CONTENT using Claude --------
    let backgroundPrompt;

    try {
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `Create a professional photography scene description for a YouTube sermon thumbnail background.

Sermon: ${sermonTitle}
Bible Verse: ${bibleVerse || "None"}
Theme hint: ${theme || "None"}

Requirements for the SCENE (not the text):
- Cinematic, warm lighting
- Colors: subtle Methodist reds/navy blues if appropriate
- Professional, photorealistic
- 16:9 framing
- Inspirational, uplifting mood
- Suitable as a clean backdrop for overlaid sermon text
- No people in center foreground
- No text of any kind

Output ONLY the scene description.`
            }
          ]
        })
      });

      const claudeData = await claudeResponse.json();
      backgroundPrompt = claudeData.content[0].text.trim();
    } catch (err) {
      console.error("Claude failed, falling back to theme prompt:");
      backgroundPrompt = fallbackPrompt(theme);
    }

    // -------- 2) Build final GPT-Image-1 prompt --------
    const finalPrompt = `
Create a professional YouTube sermon thumbnail (1920x1080). 
Photorealistic cinematic scene:

${backgroundPrompt}

Now add beautifully designed overlay text directly INTO the image:

Main Title (large, bold, cinematic):
"${sermonTitle}"

Bible Verse (smaller subtitle):
"${bibleVerse || ""}"

${includeChurchName ? 'Footer (optional, small): "Youghal Methodist Church"' : ""}

TEXT STYLE REQUIREMENTS:
- Clean, sharp, readable typography
- Strong contrast with background
- Professional YouTube thumbnail layout
- Avoid misspellings
- Place title text in a visually balanced position
- Use tasteful subtle glow/outline if needed for visibility
- Make it visually beautiful and modern
`;

    // -------- 3) Generate thumbnail using GPT-Image-1 --------

    const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
        model: "gpt-image-1",
        prompt: finalPrompt,
        size: "1536x1024",   // <-- Fixed
        n: 1
    }),
    });


    const text = await openaiResponse.text();

    if (!openaiResponse.ok) {
      console.error("OpenAI Error:", text);
      return res.status(500).json({ error: "OpenAI image generation failed", details: text });
    }

    const data = JSON.parse(text);
    const imageUrl = data.data[0].url;

    // -------- 4) Return YouTube-ready thumbnail --------
    return res.status(200).json({
      imageUrl,
      size: "1920x1080",
      titleUsed: sermonTitle,
      verseUsed: bibleVerse,
      note: "This thumbnail already contains the final designed text inside the image."
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}


// -------- THEME FALLBACK PROMPTS --------
function fallbackPrompt(theme) {
  const base = `Cinematic photorealistic church-inspired scene. Warm golden light. Subtle Methodist colors (red/navy). Peaceful and inspirational. Professional photography.`;

  const options = {
    shepherd: `${base} Rolling hills, warm sunset, gentle pastoral landscape.`,
    faith: `${base} Mountain sunrise with dramatic rays breaking through clouds.`,
    hope: `${base} Dawn light breaking through darkness over calm fields.`,
    joy: `${base} Warm radiant beams of light filling a church interior softly.`,
    worship: `${base} Soft stage lighting beams in a reverent sanctuary.`,
    peace: `${base} Calm reflective lake with soft morning mist and gentle sky.`,
    cross: `${base} Wooden cross silhouette against a dramatic golden sky.`,
  };

  return options[theme] || `${base} Peaceful natural landscape with golden light.`;
}
