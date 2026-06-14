import { Router, type IRouter } from "express";
import { Product } from "../models/Product";
import { nextSeq } from "../models/Counter";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateProductBody, UpdateProductBody, UpdateProductParams, DeleteProductParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", requireAuth, async (_req, res): Promise<void> => {
  const products = await Product.find({ active: true }).sort({ name: 1 });
  res.json(products.map(p => ({ id: p.id, name: p.name, price: p.price, active: p.active })));
});

router.post("/products", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const id = await nextSeq("products");
  const product = await Product.create({ id, name: parsed.data.name, price: parsed.data.price, active: true });

  res.status(201).json({ id: product.id, name: product.name, price: product.price, active: product.active });
});

router.put("/products/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const paramsResult = UpdateProductParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const product = await Product.findOneAndUpdate({ id: paramsResult.data.id }, updates, { new: true });
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({ id: product.id, name: product.name, price: product.price, active: product.active });
});

router.delete("/products/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const paramsResult = DeleteProductParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  await Product.findOneAndUpdate({ id: paramsResult.data.id }, { active: false });
  res.json({ success: true });
});

export default router;
