// api/generate-thumbnail.js
// Vercel Serverless Function for AI Thumbnail Generation

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sermonTitle, bibleVerse, theme } = req.body;

    if (!sermonTitle) {
      return res.status(400).json({ error: "Sermon title is required" });
    }

    // Build the image prompt
    const prompt = generatePrompt(theme, sermonTitle);

    // Call OpenAI Images API (NEW ENDPOINT)
    const response = await fetch("https://api.openai.com/v1/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1", // You can switch to "dall-e-3" if needed
        prompt: prompt,
        size: "1792x1024", // YouTube thumbnail ratio
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res
        .status(500)
        .json({ error: "Failed to generate thumbnail", details: data });
    }

    // Extract the image URL from the response
    const imageUrl = data.data?.[0]?.url;

    return res.status(200).json({
      imageUrl: imageUrl,
      overlay: {
        title: sermonTitle,
        verse: bibleVerse,
        church: "Youghal Methodist Church",
      },
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

// Prompt builder for DALL-E / GPT-Image
function generatePrompt(theme, sermonTitle) {
  const baseStyle =
    "Professional, warm, inspirational church background. Clean, not cluttered. Soft lighting. High-quality. Room for text overlay.";

  const themePrompts = {
    shepherd: `${baseStyle} Rolling green hills with a shepherd caring for sheep at golden hour.`,
    faith: `${baseStyle} Person standing on a mountain peak at sunrise, light shining through clouds.`,
    love: `${baseStyle} Golden light, warm glow, symbol of compassion and community.`,
    hope: `${baseStyle} Dawn breaking over horizon, new beginnings, rays of hope.`,
    worship: `${baseStyle} Hands raised in worship, soft stage lights, joyful reverence.`,
    cross: `${baseStyle} Simple wooden cross silhouetted against glowing sunset.`,
    peace: `${baseStyle} Calm waters, serene landscape, dove in flight.`,
    joy: `${baseStyle} Celebration, bright radiant colors, uplifting atmosphere.`,
    strength: `${baseStyle} Strong oak tree, resilient roots, mountain backdrop.`,
    community: `${baseStyle} Diverse group of people holding hands in unity.`,
  };

  const selectedPrompt = themePrompts[theme] || themePrompts.cross;

  return `${selectedPrompt} Sermon Title: ${sermonTitle}`;
}
