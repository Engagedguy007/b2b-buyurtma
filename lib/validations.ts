import { z } from "zod";

export const quickOrderSchema = z.object({
  deliveryType: z.enum(["TODAY", "TOMORROW", "CUSTOM"]),
  deliveryDate: z.string().optional(),
  note: z.string().max(500).optional(),
  items: z.array(z.object({ productId: z.string().cuid(), qty: z.number().int().positive() })).min(1)
});

export const reorderSchema = z.object({
  orderId: z.string().cuid().optional(),
  items: z.array(z.object({ productId: z.string().cuid(), qty: z.number().int().positive() })).optional(),
  deliveryType: z.enum(["TODAY", "TOMORROW", "CUSTOM"]).default("TODAY"),
  deliveryDate: z.string().optional(),
  note: z.string().max(500).optional()
});

export const templateCreateSchema = z.object({
  name: z.string().min(2).max(80),
  items: z.array(z.object({ productId: z.string().cuid(), qty: z.number().int().positive() })).min(1)
});

export const managerOrderUpdateSchema = z.object({
  status: z.enum([
    "NEW",
    "CONFIRMED",
    "IN_PRODUCTION",
    "READY",
    "ASSIGNED",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "REJECTED"
  ]),
  rejectionReason: z.string().max(300).optional(),
  assignedCourierId: z.string().cuid().optional().nullable(),
  deliveryDate: z.string().optional()
});

export const productCreateSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(40),
  unit: z.string().min(1).max(20),
  price: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
  packSize: z.number().int().positive().optional().nullable(),
  minOrderQty: z.number().int().positive().optional().nullable()
});

export const productUpdateSchema = productCreateSchema.partial();

export const courierStatusUpdateSchema = z.object({
  status: z.enum(["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"])
});

export const inviteCreateSchema = z.object({
  outletName: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  address: z.string().min(5).max(200),
  region: z.string().min(2).max(80).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7)
});

export const inviteVerifySchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/)
});

export const inviteClaimSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/),
  name: z.string().min(2).max(80),
  locale: z.enum(["UZ", "RU", "EN"]).default("UZ")
});
