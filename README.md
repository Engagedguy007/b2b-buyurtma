# Multi-Tenant B2B Buyurtma SaaS

Next.js App Router asosidagi multi-tenant B2B buyurtma platforma.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth Credentials
- Zod

## Asosiy imkoniyatlar
- Multi-tenant (`Company`) izolatsiya: har kompaniya ma'lumotlari alohida scope.
- Role-based access: `OUTLET`, `OWNER`, `COURIER`.
- Outlet Quick Order (10-20 soniya oqim): stepper, sticky action, reorder, templates.
- Outlet tracking: `Qabul qilindi -> Tayyorlanmoqda -> Yo'lda -> Yetkazildi`.
- Courier soddalashtirilgan UX:
  - `/courier/orders`
  - `/courier/orders/[id]`
  - katta status tugmalar + call/maps.
- Invite onboarding: manager token+PIN yaratadi, outlet `/join/[token]` orqali kiradi.
- i18n: `UZ/RU/EN` (default UZ), locale switcher.
- Remember me:
  - yoqilgan: 60 kun
  - o'chirilgan: 1 kun.

## Prisma model qo'shimchalari
- `Company`: `id, name, slug, defaultLocale, createdAt`
- `OutletInvite`: `token, pinHash, expiresAt, usedAt, ...`
- `companyId` qo'shildi: `User`, `OutletProfile`, `Product`, `Order`, `OrderTemplate`, `FavoriteProduct`
- `Locale` enum qo'shildi: `UZ|RU|EN`

## Local ishga tushirish
1. Install:
```bash
npm install
```

2. `.env.local` va `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/b2b_orders?schema=public"
NEXTAUTH_SECRET="replace-with-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

3. Postgres:
```bash
docker compose up -d
```

4. Migrate + generate + seed:
```bash
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

5. Run:
```bash
npm run dev
```

## Demo loginlar
- Outlet: `outlet@demo.uz / Outlet123!`
- Manager: `manager@demo.uz / Owner123!`
- Courier: `courier@demo.uz / Courier123!`

## Demo invite
- Link: `/join/demo-join-token`
- PIN: `4455`

## Test checklist
1. Outlet quick order:
- `/outlet`ga kiring
- qty tanlab zakas yuboring
- reorder va template ishlashini tekshiring

2. Outlet tracking:
- `/outlet/orders`
- timeline statuslari to'g'ri ko'rinishini tekshiring

3. Courier flow:
- `/courier/orders`
- detail sahifada ketma-ket status: `QABUL QILDIM -> YO'LDA -> YETKAZILDI`
- call/maps link ochilishini tekshiring

4. Manager flow:
- `/owner`
- order status update, courier assign
- invite yaratish (`token + pin`) va list ko'rinishi

5. Multi-tenant isolation:
- `manager2@demo.uz / Owner123!` bilan kirib boshqa company ma'lumotlari chiqmasligini tekshiring

6. Language switch:
- Headerdan UZ/RU/EN almashtiring
- Outlet/Courier ekranlari matnlari o'zgarishini tekshiring

7. Invite onboarding:
- `/join/<token>`
- PIN verify -> name -> claim -> auto-login -> `/outlet`
