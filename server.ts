import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { 
  getProducts, 
  addProduct, 
  updateProduct,
  deleteProduct,
  getOrCreateUser, 
  getUserProfile, 
  createOrder, 
  getOrders, 
  getNotifications, 
  addNotification,
  seedProducts
} from "./src/db/helpers.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini SDK with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Robust Gemini generation with exponential backoff retries and fallback models to handle 503 "High demand"/"Unavailable" states
async function generateContentWithFallbackAndRetry(
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  fallbackModels: string | string[] = 'gemini-flash-latest'
) {
  const tryModel = async (modelName: string, maxRetries = 3) => {
    let delay = 1000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK] Calling generateContent with model: ${modelName} (Attempt ${attempt}/${maxRetries})`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (error: any) {
        const errMsg = error.message || String(error);
        const isTransient = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("limit") || errMsg.includes("high demand") || errMsg.includes("temporary");
        
        if (isTransient && attempt < maxRetries) {
          console.warn(`[Gemini SDK Warning] Transient error on model ${modelName} (Attempt ${attempt}): ${errMsg}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Failed after retries with model ${modelName}`);
  };

  try {
    return await tryModel(params.model);
  } catch (primaryError: any) {
    const fallbackList = Array.isArray(fallbackModels) ? fallbackModels : [fallbackModels];
    console.warn(`[Gemini SDK Warning] Primary model ${params.model} failed completely. Error:`, primaryError.message || primaryError);
    
    for (const fallbackModel of fallbackList) {
      try {
        console.log(`[Gemini SDK] Trying fallback model: ${fallbackModel}`);
        return await tryModel(fallbackModel);
      } catch (fallbackError: any) {
        console.warn(`[Gemini SDK Warning] Fallback model ${fallbackModel} failed:`, fallbackError.message || fallbackError);
      }
    }
    
    // If we reach here, both primary and all fallbacks failed
    console.error(`[Gemini SDK Error] Primary model and all fallback models failed.`);
    throw primaryError; // Throw original error so caller can catch it
  }
}

// Seed products on startup
seedProducts().then(() => {
  console.log("Startup seeding completed.");
}).catch((err) => {
  console.error("Error during startup seeding:", err);
});

// --- API ENDPOINTS ---

// Sync User Auth State with Cloud SQL (called on client login/auth state change)
app.post("/api/users/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email, role } = req.body;
    const uid = req.user.uid;
    const userEmail = email || req.user.email || "";
    const adminEmail = 'khdersy808@gmail.com';
    
    // Always force admin role if email matches adminEmail
    const finalRole = userEmail.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : (role || 'customer');
    
    const dbUser = await getOrCreateUser(uid, name || "مستعمل", userEmail.toLowerCase(), finalRole);
    res.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error("User sync API error:", error);
    res.status(500).json({ error: error.message || "فشل مزامنة حساب المستخدم مع قاعدة البيانات." });
  }
});

// Fetch products from database (public)
app.get("/api/products", async (req, res) => {
  try {
    const items = await getProducts();
    res.json(items);
  } catch (error: any) {
    console.error("Get products API error:", error);
    res.status(500).json({ error: error.message || "فشل جلب المنتجات من قاعدة البيانات." });
  }
});

// Add a new product (admin feature)
app.post("/api/products", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user.email || "";
    const adminEmail = 'khdersy808@gmail.com';
    const profile = await getUserProfile(req.user.uid);
    const role = userEmail.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : (profile?.role || 'customer');
    
    if (role !== 'admin') {
      return res.status(403).json({ error: "غير مصرح لك بإضافة منتجات. هذه الصلاحية للمسؤولين فقط." });
    }

    const newProduct = await addProduct(req.body);
    res.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error("Add product API error:", error);
    res.status(500).json({ error: error.message || "فشل إضافة المنتج الجديد." });
  }
});

// Update an existing product (admin feature)
app.put("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user.email || "";
    const adminEmail = 'khdersy808@gmail.com';
    const profile = await getUserProfile(req.user.uid);
    const role = userEmail.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : (profile?.role || 'customer');
    
    if (role !== 'admin') {
      return res.status(403).json({ error: "غير مصرح لك بتعديل منتجات. هذه الصلاحية للمسؤولين فقط." });
    }

    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح." });
    }

    const updated = await updateProduct(productId, req.body);
    res.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("Update product API error:", error);
    res.status(500).json({ error: error.message || "فشل تعديل المنتج." });
  }
});

// Delete a product (admin feature)
app.delete("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user.email || "";
    const adminEmail = 'khdersy808@gmail.com';
    const profile = await getUserProfile(req.user.uid);
    const role = userEmail.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : (profile?.role || 'customer');
    
    if (role !== 'admin') {
      return res.status(403).json({ error: "غير مصرح لك بحذف منتجات. هذه الصلاحية للمسؤولين فقط." });
    }

    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح." });
    }

    const deleted = await deleteProduct(productId);
    res.json({ success: true, product: deleted });
  } catch (error: any) {
    console.error("Delete product API error:", error);
    res.status(500).json({ error: error.message || "فشل حذف المنتج." });
  }
});

// Place an order (public)
app.post("/api/orders", async (req, res) => {
  try {
    const newOrder = await createOrder(req.body);
    
    // Auto-generate notification for admin
    await addNotification({
      userId: 'admin',
      title: 'طلب جديد وارد 👑',
      message: `تم تقديم طلب جديد بقيمة ${newOrder.totalAmount} ر.س من العميل ${newOrder.customerName}`,
      type: 'order_created',
      orderId: String(newOrder.id)
    });

    res.json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error("Create order API error:", error);
    res.status(500).json({ error: error.message || "فشل تقديم وتثبيت الطلب." });
  }
});

// Fetch orders (authenticated: customer gets their own, admin gets all)
app.get("/api/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user.email || "";
    const adminEmail = 'khdersy808@gmail.com';
    const profile = await getUserProfile(req.user.uid);
    const role = userEmail.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : (profile?.role || 'customer');

    let list;
    if (role === 'admin') {
      list = await getOrders();
    } else {
      list = await getOrders(req.user.uid);
    }
    
    res.json(list);
  } catch (error: any) {
    console.error("Get orders API error:", error);
    res.status(500).json({ error: error.message || "فشل جلب الطلبات." });
  }
});

// Fetch Notifications (public)
app.get("/api/notifications", async (req, res) => {
  try {
    const userId = req.query.userId as string || 'admin';
    const list = await getNotifications(userId);
    res.json(list);
  } catch (error: any) {
    console.error("Get notifications API error:", error);
    res.status(500).json({ error: error.message || "فشل جلب التنبيهات." });
  }
});

// API endpoint for AI Image Generation
app.post("/api/ai/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "مفتاح API الخاص بـ Gemini غير مهيأ. يرجى إضافته في الإعدادات > الأسرار (Settings > Secrets) باسم GEMINI_API_KEY." 
      });
    }

    // Enhance and translate the prompt to English to guarantee excellent quality & correct rendering by the image generation model
    let englishPrompt = prompt;
    try {
      const enhancementResponse = await generateContentWithFallbackAndRetry({
        model: 'gemini-3.5-flash',
        contents: `You are an expert image prompt engineer for product photography.
Translate the following user product description to English if it is in Arabic, and expand it into a highly detailed, professional, and beautiful English image generation prompt for an e-commerce store product photo.
Ensure the prompt specifies: clean studio background, professional commercial product photography, luxury studio lighting, high resolution, photorealistic, 8k.
Do not include any introductory/preachy text, explanations, or quotes. Output ONLY the final English prompt.

User product description: "${prompt}"`,
      }, ['gemini-flash-latest', 'gemini-3.1-flash-lite']);
      if (enhancementResponse.text) {
        englishPrompt = enhancementResponse.text.trim().replace(/^"|"$/g, '');
      }
    } catch (e) {
      console.warn("Prompt translation/enhancement failed, using original prompt:", e);
    }

    console.log(`Generating image. Original prompt: "${prompt}". Enhanced prompt: "${englishPrompt}"`);

    let imageUrl = "";
    try {
      // 1. Try modern official Imagen model using ai.models.generateImages
      console.log("[Gemini SDK] Trying Imagen 3 (imagen-3.0-generate-002) for high-quality image generation...");
      const imagenResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: englishPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio, // "1:1", "3:4", "4:3", "9:16", "16:9"
        }
      });
      if (imagenResponse.generatedImages?.[0]?.image?.imageBytes) {
        const base64EncodeString = imagenResponse.generatedImages[0].image.imageBytes;
        imageUrl = `data:image/jpeg;base64,${base64EncodeString}`;
        console.log("[Gemini SDK] Imagen 3 generated image successfully.");
      } else {
        throw new Error("Imagen response did not contain imageBytes");
      }
    } catch (imagenErr) {
      console.warn("[Gemini SDK] Imagen 3 failed or not enabled on this API key. Trying fallback model gemini-2.5-flash-image...", imagenErr);
      
      try {
        // 2. Try gemini-2.5-flash-image
        const response = await generateContentWithFallbackAndRetry({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: englishPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio,
              imageSize: "1K"
            }
          }
        }, ['gemini-3.1-flash-image']);

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              imageUrl = `data:image/png;base64,${base64EncodeString}`;
              console.log("[Gemini SDK] gemini-2.5-flash-image generated image successfully.");
              break;
            }
          }
        }
      } catch (geminiErr) {
        console.warn("[Gemini SDK] Fallback gemini-2.5-flash-image failed as well. Handled gracefully.", geminiErr);
      }
    }

    // 3. Fallback to high-quality Unsplash placeholder if both AI models failed or returned empty
    if (!imageUrl) {
      console.log("[Gemini SDK] All AI image models failed or returned empty. Applying high-quality Unsplash fallback.");
      const lowercasePrompt = (prompt || "").toLowerCase();
      const fallbacks = [
        { keys: ['ساعة', 'watch', 'ساعات', 'ساعه'], url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80' },
        { keys: ['حذاء', 'shoe', 'sneaker', 'أحذية', 'جزمة', 'بوت'], url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80' },
        { keys: ['سماعة', 'headphone', 'earbud', 'سماعات', 'ايربودز'], url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80' },
        { keys: ['كاميرا', 'camera', 'تصوير', 'كاميرات'], url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80' },
        { keys: ['نظارة', 'glass', 'sunglass', 'نظارات', 'نظاره'], url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80' },
        { keys: ['عطر', 'perfume', 'روائح', 'عطور'], url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=80' },
        { keys: ['هاتف', 'phone', 'جوال', 'موبايل', 'ايفون', 'سامسونج'], url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80' }
      ];

      const matched = fallbacks.find(item => 
        item.keys.some(key => lowercasePrompt.includes(key))
      );
      
      imageUrl = matched ? matched.url : 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1000&q=80';
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "لم يتم إنشاء أي صورة من قبل النموذج. الرجاء المحاولة مرة أخرى." });
    }

    res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("AI Image Generation Error:", error);
    res.status(500).json({ 
      error: error.message || "حدث خطأ أثناء توليد الصورة بالذكاء الاصطناعي." 
    });
  }
});

// API endpoint for AI Product Details Generation (Name, Description, Price, Category, and Image prompt)
app.post("/api/ai/generate-product-details", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "الوصف مطلوب لتوليد تفاصيل المنتج." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "مفتاح API الخاص بـ Gemini غير مهيأ. يرجى إضافته في الإعدادات > الأسرار (Settings > Secrets) باسم GEMINI_API_KEY." 
      });
    }

    const systemInstruction = `
You are an expert product specialist and e-commerce consultant for "King Store" (متجر الملوك), a premium store selling high-end products.
Your task is to analyze the user's brief description (which can be in Arabic or English) and expand it into a fully structured, attractive, premium e-commerce product in Arabic.

Return a JSON object conforming exactly to this schema:
{
  "name": "Catchy, professional, and luxurious Arabic title for the product",
  "description": "Attractive, compelling, and professional Arabic description outlining key features, specs, and a persuasive marketing pitch",
  "price": 120.00, // a reasonable numeric price. Extract if mentioned, otherwise suggest a realistic premium pricing in numbers
  "category": "One of these existing categories: 'إلكترونيات' (electronics), 'ألعاب' (gaming), 'ساعات' (watches), 'بطاقات شحن' (gift cards), 'إكسسوارات' (accessories), or 'أخرى' (others)",
  "imagePrompt": "A highly detailed, professional English prompt for generating a beautiful high-res product photo with neutral studio background, 3D render, luxury studio lighting, commercial product photography, 8k resolution, photorealistic"
}

Do not include any markdown styling or block quotes in your response. Return pure JSON.
`;

    const response = await generateContentWithFallbackAndRetry({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          {
            text: `User request/description: "${prompt}"`
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json'
      }
    }, ['gemini-flash-latest', 'gemini-3.1-flash-lite']);

    const responseText = response.text?.trim() || "{}";
    const productData = JSON.parse(responseText);

    res.json({ success: true, ...productData });
  } catch (error: any) {
    console.error("AI Product Generation Error:", error);
    res.status(500).json({ 
      error: error.message || "حدث خطأ أثناء توليد تفاصيل المنتج بالذكاء الاصطناعي." 
    });
  }
});

// Serve health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vite middleware for development or serving compiled files in production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
