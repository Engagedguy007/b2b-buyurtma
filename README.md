# B2B Buyurtma Tizimi (Zavod -> Shahobchalar)

Next.js App Router asosidagi buyurtma tizimi. Asosiy fokus: OUTLET foydalanuvchi 10-20 soniyada tez buyurtma yuborishi.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth Credentials
- Zod validation
- bcrypt

## Rollar
- `OUTLET`: Tez zakas, qayta buyurtma, shablonlar, tarix
- `MANAGER`: Buyurtma statuslari, kurer biriktirish, product CRUD
- `COURIER`: O'ziga biriktirilgan buyurtmalar, status update

## Tez boshlash
1. Dependencyni o'rnating:
```bash
npm install
```

2. `.env.local` yarating:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/b2b_orders?schema=public"
NEXTAUTH_SECRET="replace-with-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

3. PostgreSQL ishga tushiring.

### Variant A: Docker
```bash
docker compose up -d
```
`docker-compose.yml` ichida `postgres:16` konfiguratsiyasi bor.

### Variant B: Neon/Supabase
`DATABASE_URL` ga cloud connection string qo'ying.

4. Prisma migrate + generate + seed:
```bash
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

5. Development server:
```bash
npm run dev
```

## Demo loginlar
- Outlet: `outlet@demo.uz / Outlet123!`
- Manager: `manager@demo.uz / Manager123!`
- Courier: `courier@demo.uz / Courier123!`

## Asosiy ekranlar
- `/outlet`: Quick Order (search, favorites, stepper, sticky jami + zakas)
- `/manager`: buyurtmalarni boshqarish va mahsulot CRUD
- `/courier`: biriktirilgan buyurtmalar va statuslar

## Biznes qoidalar
- Outlet buyurtmada faqat `qty + deliveryDate + note` yuboradi.
- Telefon/manzil `OutletProfile` ichida saqlanadi.
- `isActive=false` bo'lgan mahsulot outletga ko'rinmaydi.
- `minOrderQty` va `packSize` serverda Zod + business validation bilan tekshiriladi.
