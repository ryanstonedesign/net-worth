# Worthfolio

Know what you're worth — and where you're headed. A private, end-to-end
encrypted net worth tracker with forecasting, goals, and cross-device sync.

## Local development

```bash
npm install
npm run dev
```

Run the deterministic forecast and Ask Worthfolio contract tests with:

```bash
npm test
```

## Ask Worthfolio gateway

Custom questions use the `ask-worthfolio` Supabase Edge Function. The browser
never receives the OpenAI API key: it sends a compact account/scenario manifest
to the gateway, executes requested financial calculations locally, and returns
only the bounded evidence needed to narrate the answer.

Before deploying the function:

1. For an existing Supabase project, apply `supabase/ask-worthfolio.sql` to
   create the request-quota table and function. New projects can use the full
   `supabase/schema.sql` as usual.
2. Configure Edge Function secrets:

```bash
supabase secrets set OPENAI_API_KEY=your-project-key
supabase secrets set ASK_WORTHFOLIO_SIGNING_SECRET=a-long-random-secret
supabase secrets set ASK_ALLOWED_ORIGINS=https://your-production-origin.example
supabase secrets set OPENAI_MODEL=gpt-5.6-luna
supabase secrets set ASK_DAILY_REQUEST_LIMIT=60
```

3. Deploy the gateway:

```bash
supabase functions deploy ask-worthfolio
```

The daily limit counts provider requests. A normal custom question uses two:
one to choose the local calculation and one to narrate its validated evidence.
Starter questions calculate entirely on-device and do not consume API quota.
