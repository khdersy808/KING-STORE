import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Smart fallback keyword-based image processor in case Gemini API is unavailable or keys are not set
  function getFallbackEdit(promptText: string) {
    const p = (promptText || "").toLowerCase();
    const res = {
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      sepia: 0.0,
      hueRotate: 0,
      blur: 0,
      grayscale: 0,
      invert: 0,
      textOverlay: null as any,
      border: null as any,
      explanation: "تم تحسين الصورة وضبط الإضاءة وتوازن الألوان لتلائم هوية المتجر."
    };

    if (p.includes("مشرق") || p.includes("إضاءة") || p.includes("bright") || p.includes("أبيض") || p.includes("تفتيح")) {
      res.brightness = 1.3;
      res.contrast = 1.05;
      res.explanation = "تم زيادة سطوع وإضاءة الصورة بنسبة 30% مع تباين طفيف لإبراز تفاصيل المنتج بوضوح ملكي.";
    } else if (p.includes("كلاسيك") || p.includes("قديم") || p.includes("vintage") || p.includes("warm") || p.includes("دافئ") || p.includes("ذهبي")) {
      res.sepia = 0.4;
      res.brightness = 0.98;
      res.contrast = 1.05;
      res.explanation = "تم تطبيق طابع كلاسيكي دافئ (Warm Vintage Filter) يمنح المنتج مظهرًا فخمًا وعريقًا.";
    } else if (p.includes("رمادي") || p.includes("سود") || p.includes("أبيض وأسود") || p.includes("gray") || p.includes("black")) {
      res.grayscale = 1.0;
      res.contrast = 1.2;
      res.explanation = "تم تحويل ألوان الصورة بالكامل إلى الأبيض والأسود الكلاسيكي الفاخر بتباين مرتفع.";
    } else if (p.includes("ألوان") || p.includes("مشبع") || p.includes("vibrant") || p.includes("color") || p.includes("حيوية")) {
      res.saturation = 1.35;
      res.contrast = 1.05;
      res.explanation = "تم زيادة تشبع الألوان بنسبة 35% لإظهار تفاصيل وألوان المنتج بمظهر حيوي لافت للانتباه.";
    } else if (p.includes("ضباب") || p.includes("تغبيش") || p.includes("blur") || p.includes("خلفية")) {
      res.blur = 2;
      res.explanation = "تم تطبيق تأثير ضبابي خفيف وناعم لتسليط التركيز البصري بالكامل على منتجك الأساسي.";
    } else if (p.includes("عكس") || p.includes("invert")) {
      res.invert = 1.0;
      res.explanation = "تم عكس ألوان الصورة بنجاح لخلق تباين فريد وتصميم فني مبتكر.";
    }

    // Check for border requests
    if (p.includes("إطار") || p.includes("حدود") || p.includes("border") || p.includes("frame")) {
      res.border = {
        color: p.includes("أسود") || p.includes("black") ? "#000000" : "#d97706", // gold/amber or black
        width: 12
      };
    }

    // Check for text watermark requests
    if (p.includes("كتابة") || p.includes("نص") || p.includes("اسم") || p.includes("أضف") || p.includes("text") || p.includes("write") || p.includes("علامة")) {
      res.textOverlay = {
        text: "KING STORE 👑",
        color: "#d97706", // amber color
        position: "bottom-center",
        fontSize: 24
      };
    }

    return res;
  }

  // API routes FIRST
  app.post("/api/gemini/edit-image", async (req, res) => {
    try {
      const { prompt, imageBase64 } = req.body;
      if (!prompt || !imageBase64) {
        return res.status(400).json({ error: "Missing prompt or imageBase64" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      
      // If API Key is missing or default, run our smart fallback directly and bypass premium API calls
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.log("No Gemini API key found, running smart local fallback");
        const fallbackInstructions = getFallbackEdit(prompt);
        return res.json({
          success: true,
          instructions: fallbackInstructions,
          explanation: fallbackInstructions.explanation,
          isAI: false
        });
      }

      try {
        // Initialize Gemini AI with standard free-tier model (gemini-3.5-flash)
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        // Strip the data:image/...;base64, prefix if present
        let base64Data = imageBase64;
        let mimeType = 'image/jpeg';
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }

        const systemPrompt = `Analyze this product image and the user's modification request: "${prompt}". 
Determine the best visual rendering and CSS-like canvas filter settings to achieve this desired result.
You must return a JSON object representing the editing parameters.

The JSON schema must be exactly as follows:
{
  "brightness": number (default 1.0, range 0.1 to 3.0),
  "contrast": number (default 1.0, range 0.1 to 3.0),
  "saturation": number (default 1.0, range 0.0 to 3.0),
  "sepia": number (default 0.0, range 0.0 to 1.0),
  "hueRotate": number (default 0, in degrees, range 0 to 360),
  "blur": number (default 0, in pixels, range 0 to 20),
  "grayscale": number (default 0.0, range 0.0 to 1.0),
  "invert": number (default 0.0, range 0.0 to 1.0),
  "textOverlay": {
    "text": string,
    "color": string (hex color, e.g., "#d97706" or "#ffffff"),
    "position": "center" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right",
    "fontSize": number
  } | null,
  "border": {
    "color": string (hex color),
    "width": number (in pixels)
  } | null,
  "explanation": string (A professional explanation in Arabic of what adjustments were simulated to match their request)
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: systemPrompt,
            },
          ],
          config: {
            responseMimeType: "application/json"
          }
        });

        const textResponse = response.text || "";
        console.log("Gemini 3.5 Flash response:", textResponse);

        try {
          const instructions = JSON.parse(textResponse.trim());
          return res.json({
            success: true,
            instructions: {
              brightness: typeof instructions.brightness === 'number' ? instructions.brightness : 1.0,
              contrast: typeof instructions.contrast === 'number' ? instructions.contrast : 1.0,
              saturation: typeof instructions.saturation === 'number' ? instructions.saturation : 1.0,
              sepia: typeof instructions.sepia === 'number' ? instructions.sepia : 0.0,
              hueRotate: typeof instructions.hueRotate === 'number' ? instructions.hueRotate : 0,
              blur: typeof instructions.blur === 'number' ? instructions.blur : 0,
              grayscale: typeof instructions.grayscale === 'number' ? instructions.grayscale : 0.0,
              invert: typeof instructions.invert === 'number' ? instructions.invert : 0.0,
              textOverlay: instructions.textOverlay || null,
              border: instructions.border || null
            },
            explanation: instructions.explanation || "تم معالجة وتعديل الصورة بنجاح لتلائم طلبك.",
            isAI: true
          });
        } catch (parseError) {
          console.error("Failed to parse JSON from Gemini, falling back to local keywords:", parseError);
          const fallbackInstructions = getFallbackEdit(prompt);
          return res.json({
            success: true,
            instructions: fallbackInstructions,
            explanation: fallbackInstructions.explanation,
            isAI: false
          });
        }
      } catch (geminiError: any) {
        console.error("Gemini API error (most likely billing/quota), using graceful local fallback:", geminiError);
        const fallbackInstructions = getFallbackEdit(prompt);
        return res.json({
          success: true,
          instructions: fallbackInstructions,
          explanation: fallbackInstructions.explanation,
          isAI: false
        });
      }
    } catch (err: any) {
      console.error("AI Image Edit Root Error:", err);
      // Even in root error, don't crash, return a functional fallback!
      try {
        const fallbackInstructions = getFallbackEdit(req.body?.prompt || "");
        return res.json({
          success: true,
          instructions: fallbackInstructions,
          explanation: fallbackInstructions.explanation,
          isAI: false
        });
      } catch (fallbackErr) {
        res.status(500).json({ error: "Failed to process image edit instructions" });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
