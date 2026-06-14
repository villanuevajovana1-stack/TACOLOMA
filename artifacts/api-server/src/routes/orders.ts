import { Router, type IRouter } from "express";
import { z } from "zod";
import { Order } from "../models/Order";
import { Product } from "../models/Product";
import { nextSeq } from "../models/Counter";
import { requireAuth } from "../middlewares/auth";
import { CreateOrderBody, GetOrdersQueryParams, UpdateOrderStatusParams, UpdateOrderStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatOrder(order: InstanceType<typeof Order>) {
  const items = (order.items as any[]).map((item: any) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    price: item.price,
    notes: item.notes ?? "",
  }));
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return {
    id: order.id,
    clientName: order.clientName,
    status: order.status,
    waiterName: order.waiterName,
    createdAt: (order.createdAt as Date).toISOString(),
    items,
    total,
  };
}

router.get("/orders/summary", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const options = { timeZone: "America/Mexico_City", year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const today = new Date(`${year}-${month}-${day}T00:00:00-06:00`);

  const orders = await Order.find({ createdAt: { $gte: today } }).sort({ createdAt: 1 });
  const formatted = orders.map(formatOrder);
  const totalRevenue = formatted.filter(o => o.status === "paid").reduce((sum, o) => sum + o.total, 0);

  res.json({
    totalOrders: orders.length,
    totalRevenue,
    paidOrders: orders.filter(o => o.status === "paid").length,
    pendingOrders: orders.filter(o => o.status === "pending").length,
    orders: formatted,
  });
});

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const queryParsed = GetOrdersQueryParams.safeParse(req.query);
  const filter: Record<string, unknown> = {};
  if (queryParsed.success && queryParsed.data.status) {
    filter.status = queryParsed.data.status;
  }

  const orders = await Order.find(filter).sort({ createdAt: 1 });
  res.json(orders.map(formatOrder));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientName, items } = parsed.data;
  const waiterName = req.user!.name;
  const waiterId = req.user!.userId;

  const orderItems = [];
  let itemSeq = 1;
  for (const item of items) {
    const product = await Product.findOne({ id: item.productId });
    if (!product) continue;
    orderItems.push({
      id: itemSeq++,
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
      notes: (item as any).notes ?? "",
    });
  }

  const id = await nextSeq("orders");
  const order = await Order.create({
    id,
    clientName,
    status: "pending",
    waiterId,
    waiterName,
    items: orderItems,
  });

  res.status(201).json(formatOrder(order));
});

router.patch("/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const paramsResult = UpdateOrderStatusParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const order = await Order.findOneAndUpdate(
    { id: paramsResult.data.id },
    { status: parsed.data.status },
    { new: true }
  );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(formatOrder(order));
});

router.post("/orders/:id/items", requireAuth, async (req, res): Promise<void> => {
  const paramsResult = UpdateOrderStatusParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const itemsBody = z.object({
    items: z.array(z.object({
      productId: z.number(),
      quantity: z.number(),
      notes: z.string().optional(),
    }))
  }).safeParse(req.body);
  if (!itemsBody.success) {
    res.status(400).json({ error: itemsBody.error.message });
    return;
  }

  const order = await Order.findOne({ id: paramsResult.data.id });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const newItems = [];
  let itemSeq = (order.items?.length ?? 0) + 1;
  for (const it of itemsBody.data.items) {
    const product = await Product.findOne({ id: it.productId });
    if (!product) continue;
    newItems.push({
      id: itemSeq++,
      productId: it.productId,
      productName: product.name,
      quantity: it.quantity,
      price: product.price,
      notes: it.notes ?? "",
    });
  }

  order.items = [...(order.items ?? []), ...newItems];
  await order.save();

  res.json(formatOrder(order as any));
});
export default router;
