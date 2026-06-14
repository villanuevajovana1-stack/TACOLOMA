# Tacos Loma - Sistema de Órdenes

App móvil para toma de órdenes de restaurante con 3 roles de usuario: Admin, Mesero y Cajero.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — corre el API server (puerto 5000)
- `pnpm --filter @workspace/mobile run dev` — corre la app móvil (Expo)
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — regenera hooks y schemas desde OpenAPI spec
- `pnpm --filter @workspace/db run push` — aplica cambios de schema DB (solo dev)
- Required env: `DATABASE_URL` — PostgreSQL connection string, `SESSION_SECRET` — JWT secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo + React Native (expo-router)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Contrato OpenAPI (fuente de verdad)
- `lib/db/src/schema/` — Schema de base de datos (users, products, orders, orderItems)
- `artifacts/api-server/src/routes/` — Rutas del servidor
- `artifacts/api-server/src/lib/jwt.ts` — Utilidades JWT
- `artifacts/api-server/src/middlewares/auth.ts` — Middleware de autenticación
- `artifacts/mobile/app/` — Pantallas de la app (login, admin, waiter, cashier)
- `artifacts/mobile/context/AuthContext.tsx` — Estado de autenticación
- `artifacts/mobile/constants/colors.ts` — Paleta de colores Tacos Loma

## Architecture decisions

- JWT para autenticación sin estado (7 días de expiración)
- Roles: admin, waiter (mesero), cashier (cajero)
- Flujo de órdenes: pending → delivered → billing → paid
- AsyncStorage para persistir el token JWT en el móvil
- setAuthTokenGetter provee el token a todos los API calls automáticamente

## Product

- **Login**: Todos los roles ingresan con usuario/contraseña
- **Admin**: Gestión de productos (CRUD con precio), usuarios (CRUD con roles), ventas del día
- **Mesero**: Crear órdenes (cliente + búsqueda de productos), ver Pendientes/Entregados/Por Cobrar, marcar como entregado o mandar a cobrar
- **Cajero**: Ver órdenes por cobrar, buscar cliente, ver ticket detallado (productos/cantidades/total), marcar como cobrado

## User preferences

- Colores marca: fondo #3D2312, card #5C3520, primary #E07050, secondary #4A7A5E
- Idioma español en toda la UI

## Gotchas

- Credenciales por defecto: admin/admin123 (se regeneran en cada arranque del servidor)
- El codegen de Orval regenera lib/api-zod/src/index.ts — NO agregar `export * from "./generated/types"` de vuelta (causa conflicto de nombres)
- Después de cambiar el OpenAPI spec, correr codegen antes de usar los hooks

## Pointers

- Ver el skill `pnpm-workspace` para estructura del workspace
