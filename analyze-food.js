// Vercel serverless function: POST /api/analyze-food
// Keeps ANTHROPIC_API_KEY on the server. Set it in your Vercel project's
// Environment Variables (Settings -> Environment Variables) before deploying.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server" });
    return;
  }

  const { base64Data, mediaType } = req.body || {};
  if (!base64Data) {
    res.status(400).json({ error: "Missing base64Data" });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: base64Data } },
              {
                type: "text",
                text:
                  "วิเคราะห์รูปอาหารนี้ ประมาณการชื่ออาหาร แคลอรี่ และสารอาหารหลักสำหรับปริมาณที่เห็นในภาพ " +
                  "ตอบกลับเป็น JSON เท่านั้น ไม่มีคำอธิบายอื่นใดๆ ไม่มี markdown fences รูปแบบ: " +
                  '{"food_name": "ชื่ออาหารภาษาไทย", "portion_note": "คำอธิบายปริมาณสั้นๆ", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}',
              },
            ],
          },
        ],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data.error?.message || "Anthropic API error" });
      return;
    }

    const text = (data.content || []).map((c) => c.text || "").join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "Failed to analyze photo: " + e.message });
  }
}
