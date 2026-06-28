import { pgTable, serial, text, timestamp, integer, doublePrecision, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').default('customer').notNull(), // 'admin' or 'customer'
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: doublePrecision('price').notNull(),
  type: text('type').default('physical').notNull(), // 'physical' or 'digital'
  category: text('category').notNull(),
  imageUrl: text('image_url').notNull(),
  stock: integer('stock'),
  downloadUrl: text('download_url'),
  licenseKeys: jsonb('license_keys'), // Store array of strings
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerUid: text('customer_uid'), // Links to users.uid
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  shippingAddress: text('shipping_address'),
  totalAmount: doublePrecision('total_amount').notNull(),
  paymentMethodId: text('payment_method_id').notNull(),
  paymentDetails: jsonb('payment_details').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'completed', 'cancelled'
  date: timestamp('date').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  price: doublePrecision('price').notNull(),
  quantity: integer('quantity').notNull(),
  type: text('type').notNull(), // 'physical' or 'digital'
});

export const appNotifications = pgTable('app_notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // 'admin' or user email/id
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: text('is_read').default('false').notNull(), // 'true' or 'false'
  type: text('type').notNull(), // 'order_created', 'order_status_updated', 'system'
  orderId: text('order_id'),
  date: timestamp('date').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  customer: one(users, {
    fields: [orders.customerUid],
    references: [users.uid],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
