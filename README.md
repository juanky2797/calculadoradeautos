Car import quoter (Next.js) modeled after the provided Canva calculator.

## Getting Started

Install deps and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Formulas (must match Canva)

- Total auto (FOB): `precio_unitario * cantidad`
- Comisión: `5%` sobre FOB
- Costos fijos: `250 + 850 + 260`
- Cargadores opcionales: portátil `$30`, residencial `$300`, conjuntos adicionales `$330 c/u`
- Subtotal: suma de todo lo anterior + flete
- ITBMS: `7%` sobre subtotal
- Total: `subtotal + ITBMS`
- Condiciones de pago: `30%` para reservar, `70%` antes del embarque

## Customize company info

Edit `src/app/car-quote-calculator.tsx` (`defaultConfig`).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Build

```bash
npm run build
npm run start
```
