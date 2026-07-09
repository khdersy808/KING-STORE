import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio = "1:1" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "الوصف مطلوب لتوليد الصورة." });
      }

      // 1. Translate and refine prompt using gemini-2.5-flash to get a perfect English e-commerce studio photograph description
      let refinedPrompt = `A highly realistic, commercial e-commerce studio photograph of ${prompt}, plain light grey background, sharp focus, 8k resolution, photorealistic, no text`;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const refineResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert AI prompt engineer for e-commerce product photography. 
Translate and refine this product description into a highly detailed, professional English product photography prompt for an AI image generator.

Original description: "${prompt}"

Rules:
- Output ONLY the final refined English prompt.
- Do not include any quotes, markdown formatting, introductory text, or concluding text.
- Format the output exactly like this: "A highly realistic, commercial e-commerce studio photograph of [translated and refined product details], plain light grey background, sharp focus, 8k resolution, photorealistic, no text"
- Example: If input is "قميص بولو شبابي", output must be: "A highly realistic, commercial e-commerce studio photograph of a premium men's polo shirt, plain light grey background, sharp focus, 8k resolution, photorealistic, no text"`,
          });
          
          if (refineResponse.text && refineResponse.text.trim()) {
            refinedPrompt = refineResponse.text.trim();
            console.log("Gemini translated & refined prompt:", refinedPrompt);
          }
        } catch (refineErr) {
          console.warn("Prompt refinement failed, using formatted original prompt:", refineErr);
        }
      }

      // Sanitize the prompt to remove newlines, double quotes and other hazardous characters
      const cleanPrompt = refinedPrompt
        .replace(/["']/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();

      console.log("Final clean prompt sent to Pollinations:", cleanPrompt);

      // Determine size based on aspect ratio
      let width = 1024;
      let height = 1024;
      
      if (aspectRatio === '16:9') { width = 1024; height = 576; }
      else if (aspectRatio === '9:16') { width = 576; height = 1024; }
      else if (aspectRatio === '4:3') { width = 1024; height = 768; }
      else if (aspectRatio === '3:4') { width = 768; height = 1024; }

      try {
        // 2. Fetch the image directly from Pollinations AI for free, unlimited, and high-quality generation
        const seed = Math.floor(Math.random() * 1000000);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
        
        console.log(`Fetching image from Pollinations: ${pollinationsUrl}`);
        const imageResponse = await fetch(pollinationsUrl);
        
        if (!imageResponse.ok) {
          throw new Error(`Pollinations API returned status: ${imageResponse.status}`);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const imageUrl = `data:image/png;base64,${base64Image}`;

        return res.json({
          success: true,
          imageUrl: imageUrl
        });

      } catch (pollinationsError: any) {
        console.error("Pollinations generation error:", pollinationsError);
        return res.status(500).json({ 
          success: false, 
          error: `حدث خطأ أثناء توليد الصورة بالخادم المجاني: ${pollinationsError.message || pollinationsError}` 
        });
      }
    } catch (err: any) {
      console.error("AI Image Gen Root Error:", err);
      return res.status(500).json({ 
        success: false, 
        error: `خطأ داخلي في الخادم: ${err.message || err}` 
      });
    }
  });

  app.post("/api/gemini/edit-image", async (req, res) => {
    try {
      const { prompt, imageBase64 } = req.body;
      if (!prompt || !imageBase64) {
        return res.status(400).json({ error: "Missing prompt or imageBase64" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("No Gemini API key found, running smart local fallback");
        const fallbackInstructions = getFallbackEdit(prompt);
        return res.json({
          success: true,
          instructions: fallbackInstructions,
          explanation: fallbackInstructions.explanation,
          isAI: false
        });
      }

      try {
        // Initialize Gemini AI with standard model (gemini-2.5-flash)
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
You must return a JSON object representing the editing parameters matching the response schema exactly.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
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
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                brightness: {
                  type: Type.NUMBER,
                  description: "Brightness multiplier. Default 1.0, range 0.1 to 3.0"
                },
                contrast: {
                  type: Type.NUMBER,
                  description: "Contrast multiplier. Default 1.0, range 0.1 to 3.0"
                },
                saturation: {
                  type: Type.NUMBER,
                  description: "Saturation multiplier. Default 1.0, range 0.0 to 3.0"
                },
                sepia: {
                  type: Type.NUMBER,
                  description: "Sepia filter. Default 0.0, range 0.0 to 1.0"
                },
                hueRotate: {
                  type: Type.INTEGER,
                  description: "Hue rotate in degrees. Default 0, range 0 to 360"
                },
                blur: {
                  type: Type.INTEGER,
                  description: "Blur radius in pixels. Default 0, range 0 to 20"
                },
                grayscale: {
                  type: Type.NUMBER,
                  description: "Grayscale filter. Default 0.0, range 0.0 to 1.0"
                },
                invert: {
                  type: Type.NUMBER,
                  description: "Invert filter. Default 0.0, range 0.0 to 1.0"
                },
                textOverlay: {
                  type: Type.OBJECT,
                  description: "Optional text watermark/overlay details. Null if not requested.",
                  properties: {
                    text: { type: Type.STRING },
                    color: { type: Type.STRING, description: "hex color, e.g., #ffffff" },
                    position: { 
                      type: Type.STRING, 
                      description: "One of: center, top, bottom, top-left, top-right, bottom-left, bottom-right" 
                    },
                    fontSize: { type: Type.INTEGER }
                  },
                  required: ["text", "color", "position", "fontSize"]
                },
                border: {
                  type: Type.OBJECT,
                  description: "Optional border details. Null if not requested.",
                  properties: {
                    color: { type: Type.STRING, description: "hex color" },
                    width: { type: Type.INTEGER, description: "width in pixels" }
                  },
                  required: ["color", "width"]
                },
                explanation: {
                  type: Type.STRING,
                  description: "A professional explanation in Arabic of what adjustments were simulated to match their request"
                }
              },
              required: ["brightness", "contrast", "saturation", "sepia", "hueRotate", "blur", "grayscale", "invert", "explanation"]
            }
          }
        });

        const textResponse = response.text || "";
        console.log("Gemini 2.5 Flash response:", textResponse);

        let cleanText = textResponse.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```(json)?\s*/i, "");
          cleanText = cleanText.replace(/\s*```$/, "");
        }
        cleanText = cleanText.trim();

        try {
          const instructions = JSON.parse(cleanText);
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
        } catch (parseError: any) {
          console.error("Failed to parse JSON from Gemini:", parseError, "Cleaned response was:", cleanText);
          return res.status(500).json({ 
            success: false, 
            error: `فشل في تحليل استجابة الذكاء الاصطناعي: ${parseError.message}` 
          });
        }
      } catch (geminiError: any) {
        console.error("Gemini API error:", geminiError);
        return res.status(500).json({ 
          success: false, 
          error: `حدث خطأ أثناء الاتصال بـ Gemini API: ${geminiError.message || geminiError}` 
        });
      }
    } catch (err: any) {
      console.error("AI Image Edit Root Error:", err);
      return res.status(500).json({ 
        success: false, 
        error: `خطأ داخلي في الخادم: ${err.message || err}` 
      });
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
