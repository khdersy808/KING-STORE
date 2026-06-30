import { db } from './index.ts';
import { users, products, orders, orderItems, appNotifications } from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { INITIAL_PRODUCTS } from '../data.ts';

// --- Users Helpers ---
export async function getOrCreateUser(uid: string, name: string, email: string, role: string = 'customer') {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        name,
        email,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          name,
          email,
          role,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Failed to register or update user profile.", { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database fetch user profile failed:", error);
    throw new Error("Failed to load user profile from database.", { cause: error });
  }
}

// --- Products Helpers ---
export async function seedProducts() {
  try {
    const existing = await db.select().from(products).limit(1);
    if (existing.length === 0) {
      console.log("Seeding products into Cloud SQL...");
      const productsToInsert = INITIAL_PRODUCTS.map((p) => ({
        name: p.name,
        description: p.description,
        price: p.price,
        type: p.type,
        category: p.category,
        imageUrl: p.imageUrl,
        stock: p.stock || null,
        downloadUrl: p.downloadUrl || null,
        licenseKeys: p.licenseKeys || null,
      }));
      await db.insert(products).values(productsToInsert);
      console.log("Products seeded successfully.");
    }
  } catch (error) {
    console.error("Failed to seed products:", error);
  }
}

export async function getProducts() {
  try {
    // Automatically seed if empty
    await seedProducts();
    return await db.select().from(products).orderBy(desc(products.id));
  } catch (error) {
    console.error("Database fetch products failed:", error);
    throw new Error("Failed to fetch product list.", { cause: error });
  }
}

export async function addProduct(productData: {
  name: string;
  description: string;
  price: number;
  type: string;
  category: string;
  imageUrl: string;
  stock?: number;
  downloadUrl?: string;
  licenseKeys?: string[];
}) {
  try {
    const result = await db.insert(products)
      .values({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        type: productData.type,
        category: productData.category,
        imageUrl: productData.imageUrl,
        stock: productData.stock || null,
        downloadUrl: productData.downloadUrl || null,
        licenseKeys: productData.licenseKeys || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database insert product failed:", error);
    throw new Error("Failed to add new product.", { cause: error });
  }
}

export async function updateProduct(id: number, productData: {
  name?: string;
  description?: string;
  price?: number;
  type?: string;
  category?: string;
  imageUrl?: string;
  stock?: number;
  downloadUrl?: string;
  licenseKeys?: string[];
}) {
  try {
    const result = await db.update(products)
      .set({
        name: productData.name,
        description: productData.description,
        price: productData.price !== undefined ? Number(productData.price) : undefined,
        type: productData.type,
        category: productData.category,
        imageUrl: productData.imageUrl,
        stock: productData.stock !== undefined ? productData.stock : null,
        downloadUrl: productData.downloadUrl !== undefined ? productData.downloadUrl : null,
        licenseKeys: productData.licenseKeys !== undefined ? productData.licenseKeys : null,
      })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database update product failed:", error);
    throw new Error(`Failed to update product with ID ${id}.`, { cause: error });
  }
}

export async function deleteProduct(id: number) {
  try {
    const result = await db.delete(products)
      .where(eq(products.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database delete product failed:", error);
    throw new Error(`Failed to delete product with ID ${id}.`, { cause: error });
  }
}

// --- Orders Helpers ---
export async function createOrder(orderData: {
  customerUid?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string;
  totalAmount: number;
  paymentMethodId: string;
  paymentDetails: any;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    type: string;
  }[];
}) {
  try {
    // 1. Insert into orders table
    const orderResult = await db.insert(orders)
      .values({
        customerUid: orderData.customerUid || null,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        shippingAddress: orderData.shippingAddress || null,
        totalAmount: orderData.totalAmount,
        paymentMethodId: orderData.paymentMethodId,
        paymentDetails: orderData.paymentDetails,
        status: 'pending',
      })
      .returning();

    const createdOrder = orderResult[0];

    // 2. Insert order items
    if (orderData.items && orderData.items.length > 0) {
      const itemsToInsert = orderData.items.map(item => ({
        orderId: createdOrder.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        type: item.type,
      }));
      await db.insert(orderItems).values(itemsToInsert);
    }

    return createdOrder;
  } catch (error) {
    console.error("Database create order failed:", error);
    throw new Error("Failed to save and process your order.", { cause: error });
  }
}

export async function getOrders(customerUid?: string) {
  try {
    if (customerUid) {
      return await db.select().from(orders).where(eq(orders.customerUid, customerUid)).orderBy(desc(orders.id));
    } else {
      return await db.select().from(orders).orderBy(desc(orders.id));
    }
  } catch (error) {
    console.error("Database fetch orders failed:", error);
    throw new Error("Failed to retrieve orders.", { cause: error });
  }
}

// --- Notifications Helpers ---
export async function getNotifications(userId: string) {
  try {
    return await db.select().from(appNotifications).where(eq(appNotifications.userId, userId)).orderBy(desc(appNotifications.id));
  } catch (error) {
    console.error("Database fetch notifications failed:", error);
    throw new Error("Failed to load notifications.", { cause: error });
  }
}

export async function addNotification(notificationData: {
  userId: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
}) {
  try {
    const result = await db.insert(appNotifications)
      .values({
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        orderId: notificationData.orderId || null,
        isRead: 'false',
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database insert notification failed:", error);
    throw new Error("Failed to generate notification record.", { cause: error });
  }
}
