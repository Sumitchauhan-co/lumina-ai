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

## Google sign-in

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. The default OAuth
redirect URI is `http://localhost:3000/api/auth/google/callback`; register that
exact URI in the Google Cloud OAuth client. If the app uses another origin,
set `GOOGLE_REDIRECT_URI` to the exact registered URI.

## GitHub sign-in

Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`, then register
`http://localhost:3000/api/auth/github/callback` as the GitHub OAuth callback
URL. For another origin, set `GITHUB_REDIRECT_URI` to the exact registered URL.
`GITHUB_WEBHOOK_SECRET` is not used for OAuth; no webhook handler is included.

## Chat and Pro billing

Configure the backend environment:

- `OPENROUTER_API_KEY`
- Free chat is limited to `openai/gpt-4o-mini`; Pro adds `openai/gpt-4o`.
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PRO_PLAN_ID`
- `PRO_MONTHLY_TOKEN_ALLOWANCE` (optional; defaults to `100000`)
- `PRO_MONTHLY_PRICE_PAISE` (optional; defaults to `39900` for INR 399)

Keep Razorpay test credentials and live credentials in their respective
deployment environments; do not mix the key ID, key secret, plan ID, and
webhook secret across modes. Create a Razorpay plan for INR 399 billed monthly,
then set its ID in `RAZORPAY_PRO_PLAN_ID`. Configure Razorpay to deliver
subscription events to `/api/razorpay/webhook` on the deployed host, using the
same signing secret in `RAZORPAY_WEBHOOK_SECRET`.

The chat and conversation endpoints require the existing Bearer access token.
`POST /api/chat` returns Server-Sent Events: `meta` includes the conversation
ID and model, `delta` carries generated text, and `done` includes final token
usage and quota. The `error` event indicates a failure after streaming starts.
Use `GET /api/chat/quota` for current usage and limits.

The billing API is rooted at `/api/billing` (`status`, `checkout`, `verify`,
and `cancel`); the webhook endpoint is `/api/razorpay/webhook`. The configured
`RAZORPAY_PRO_PLAN_ID` is authoritative, and a conflicting `planId` in a
checkout request is rejected. Subscription activation and recurring quota
resets are applied from verified webhooks.

The schema includes chat, billing, and Razorpay webhook-idempotency tables.
Generate future schema changes with `pnpm db:generate` and apply the checked-in
migrations to the intended database with `pnpm db:migrate` before using these
endpoints. Do not mix test and live database credentials.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
