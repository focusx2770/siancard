# SianCard
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Listing short codes

Listing URLs use an 8-character alphanumeric code while the database retains the UUID as its internal key. For an existing Supabase database, run [`listing_short_codes_schema.sql`](./listing_short_codes_schema.sql) in the Supabase SQL Editor before deploying the application changes. New database setups using `supabase_schema_updated.sql` already create this column and its generator.

## Seller verification documents

For seller verification, run [`verification_requests_schema.sql`](./verification_requests_schema.sql), [`verification_storage_setup.sql`](./verification_storage_setup.sql), and [`verified_seller_status.sql`](./verified_seller_status.sql) in the Supabase SQL Editor. The status migration adds the public verification flag and admin-only RPCs used to approve/reject requests. New identity-document uploads use a private bucket accessible to the document owner and admins only. Documents uploaded before this change to the public `card-images` bucket remain public; migrate them to the private bucket or delete them in Supabase Storage.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
