import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { 
  getProducts, 
  addProduct, 
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
    
    const dbUser = await getOrCreateUser(uid, name || "مستعمل", userEmail.toLowerCase(), role || "customer");
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
    const role = profile?.role || (userEmail.toLowerCase() === adminEmail ? 'admin' : 'customer');
    
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
    const role = profile?.role || (userEmail.toLowerCase() === adminEmail ? 'admin' : 'customer');

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

    // Generate image using gemini-2.5-flash-image
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio, // "1:1", "3:4", "4:3", "9:16", "16:9"
          imageSize: "1K"
        }
      }
    });

    let imageUrl = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }
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
