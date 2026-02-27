function getGeminiEnv() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
  return { apiKey, model };
}

async function fileToBase64Data(file) {
  if (!file) return null;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function extractGeminiText(payload) {
  const candidates = payload?.candidates;
  const parts = candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p?.text).filter(Boolean).join("\n");
  return text || "";
}

export async function geminiChat({
  systemPrompt,
  messages,
  imageFile,
  abortSignal,
}) {
  const { apiKey, model } = getGeminiEnv();
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = (Array.isArray(messages) ? messages : []).map((m) => {
    const role = m?.role === "assistant" ? "model" : "user";
    return {
      role,
      parts: [{ text: String(m?.text ?? "") }],
    };
  });

  if (imageFile) {
    const base64 = await fileToBase64Data(imageFile);
    if (base64) {
      const last = contents[contents.length - 1];
      if (last && last.role === "user") {
        last.parts = Array.isArray(last.parts) ? last.parts : [];
        last.parts.push({
          inlineData: {
            mimeType: imageFile.type || "image/jpeg",
            data: base64,
          },
        });
      }
    }
  }

  const body = {
    systemInstruction: systemPrompt
      ? { parts: [{ text: String(systemPrompt) }] }
      : undefined,
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || `Gemini request failed (${res.status})`;
    throw new Error(msg);
  }

  return extractGeminiText(payload);
}
