# Admobi AI visibility monitoring

Google Search Console does not report AI Overview citations separately. Use this checklist monthly (or after major content deploys).

## Technical checks (post-deploy)

```bash
curl -sI https://admobihq.com/llms.txt
curl -sI https://admobihq.com/pricing.md
curl -s https://admobihq.com/llms.txt | head
curl -s https://admobihq.com/pricing.md | head
```

- [ ] `llms.txt` returns 200 with product summary and key links
- [ ] `pricing.md` returns 200 with KES tiers and disclaimer
- [ ] `/pricing` page loads with same tier data
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) passes for `/`, `/pricing`, `/drivers` (FAQ where applicable)
- [ ] `sitemap.xml` includes `/pricing`, `/llms.txt`, `/pricing.md`
- [ ] Search Console **robots.txt** report has no warnings (Google only supports `User-agent`, `Allow`, `Disallow`, `Sitemap`; content policy is sent via the `Content-Signal` HTTP header, not as a robots.txt rule)

## Query citation log (manual)

Run each query in Google (AI Overview if shown), Perplexity, and ChatGPT with search. Record whether Admobi is cited and which URL.

| Query | Google AIO | Perplexity | ChatGPT | Admobi cited? | URL cited | Competitor cited |
|-------|:----------:|:----------:|:-------:|:-------------:|-----------|------------------|
| taxi top advertising Nairobi | | | | | | |
| taxi top advertising Kenya | | | | | | |
| digital OOH Kenya | | | | | | |
| geo targeted outdoor advertising Kenya | | | | | | |
| Admobi | | | | | | |
| AdmobiHQ | | | | | | |
| delivery bike advertising Nairobi | | | | | | |
| taxi top advertising cost Nairobi | | | | | | |

## Referral traffic

In GA4, watch referrals from AI products (e.g. `chatgpt.com`, `perplexity.ai`) if UTM or referrer data appears.

## When to refresh Phase 1 assets

- Update `lib/seo/pricing-data.ts` when rate card changes, then run `npm run generate:ai-seo` in `apps/web`
- Bump `SEO_LAST_UPDATED` in `lib/seo/site-updates.ts` when materially editing marketing copy
