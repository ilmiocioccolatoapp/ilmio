# Admin performance investigation — 27 October 2026

## Dashboard API latency — 31 October 2026

The authenticated production bootstrap request took 2.3 seconds before this
change; repeated dashboard requests took 2.7–3.7 seconds. Production inspection
showed the API function in Vercel `iad1`, while the Supabase project used by the
admin app (`Ilmio-app`, project `dkkfhmwustbajmumvlkm`) and both production
Prisma connection hosts are in `ap-northeast-2` (Seoul).

The API function is now deployed in Vercel `icn1` (Seoul). Bootstrap reads run
concurrently, Prisma projections are limited to the data returned to the
dashboard, and the admin profile query selects only its authorization fields.
The relevant foreign keys already have index coverage through explicit indexes
or leading columns of unique indexes, so no database migration was needed.

The first measured bootstrap after deployment took 810.8 ms inside the function:
Supabase Auth verification took 674.9 ms, profile lookup 37.9 ms, brand lookup
24.5 ms, organization lookup 68.3 ms, and store lookup 94.5 ms. A subsequent
warm bootstrap took 233.2 ms total; Supabase Auth verification was 58.7 ms.
Later warm bootstrap handler samples were 102.8–182.2 ms. Three sequential
authenticated production requests measured 417.4, 78.3, and 62.1 ms inside the
function; their browser-observed request times were 617, 291, and 244 ms. A warm
dashboard handler sample was 89.1 ms. These are individual samples, not
percentile guarantees. Supabase Auth varied from about 30–59 ms on most warm
requests to 353–363 ms on two outliers; no change was made to JWT verification
or revocation behavior.

The API's CORS preflight now advertises a 10-minute browser cache. Before this,
Vercel recorded an `OPTIONS` request before every dashboard `GET`, typically
about 190 ms earlier. After deployment, repeated bootstrap requests from the
same browser no longer generated another preflight.

For ongoing diagnosis, `/api/admin/me`, `/api/admin/bootstrap`, and
`/api/admin/dashboard` emit `admin_request_performance` JSON logs with phase
durations, total handler time, and function-instance age. They also return a
`Server-Timing` header. Production logs can be queried with:

```sh
vercel logs --project ilmio-app --scope ilmio --since 10m --json \
  --query 'admin_request_performance'
```

## Findings

- The deployed HTML responded in 0.13–0.40 seconds from the development machine.
- Public endpoints at `https://ilmio-app.vercel.app/api` took 0.71–0.89 seconds per read in four samples. This is a small sample, not a regional latency benchmark.
- Dashboard, Products, Categories, and the product editor each fetched their own copies of catalog data. Switching tabs discarded loaded views and repeated those reads.
- Product toggles/deletes and category changes fetched whole lists again after successful writes.
- Every auth event cleared the verified admin. A repeated `SIGNED_IN` event with the same token could clear the panel without retriggering verification; token refreshes also unmounted views unnecessarily.
- Product-card images were loaded at their original dimensions. One public image was 152,838 bytes; the 640px variant was 33,253 bytes (78% smaller).
- Independent database reads in product/category list handlers ran sequentially.

## Changes

A memory-only catalog provider now shares products and categories across dashboard, list, and editor views. Concurrent loads are deduplicated. Successful mutations update the shared data using the server's response, including dashboard totals and category counts, without a second full-list request.

Data becomes stale after 60 seconds. The visible page checks for stale data once a minute and when the tab regains focus, and refreshes it in the background. A failed refresh retains previously loaded data and offers retry. A pre-mutation read cannot overwrite a confirmed local change. The provider is destroyed on sign-out, account change, or failed authorization.

Repeated auth events preserve the existing verified view; changed access tokens are still checked by the server. Backend bearer verification and protected-response `no-store` headers remain enforced. Public category/available-product requests omit unnecessary auth headers, and requests have bounded timeouts (20 seconds API, 120 seconds image upload).

Cloudinary product cards request width-limited, automatically compressed thumbnails. Backend list handlers start independent reads in parallel without changing filters, ordering, response shape, or database schema.

## Before/after browser check

Both production builds ran locally in Chrome against intercepted fixture responses with the same **600ms API latency**. No production data was modified. The baseline used commit `c979f54`; the updated build included the local currency-symbol and performance changes. External fonts were blocked in both runs.

The workflow opened Products, toggled availability, edited a product, edited a category, returned to Dashboard, and reopened Products.

| Measurement | Before | After |
| --- | ---: | ---: |
| Open Products after Dashboard | 904ms | 126ms |
| Toggle availability | 1,323ms | 824ms |
| Save product and display updated card | 1,669ms | 819ms |
| Product-list GET requests | 6 | 1 |
| Category-list GET requests | 6 | 1 |
| Total API requests | 16 | 6 |
| Browser runtime errors | 0 | 0 |

These are single-run controlled measurements, not guaranteed production timings. First-time sign-in, a real database write, and uploads still require network requests. Deployment is required to change production behavior.

## Validation

- Admin integration tests cover navigation, shared totals/counts after writes, failed writes, repeated auth events, token refresh, revoked access, deletion, and account isolation.
- Resource tests cover concurrent readers, fresh/stale data, failed refresh recovery, and read/write races.
- Backend tests verify that independent reads begin concurrently while preserving product ordering and category counts. Existing auth/error/upload tests also pass.
- Production build and browser workflow pass.

## Separate issue found

The Settings screen's Save button currently uses timers to simulate saving; no settings persistence endpoint exists. This performance change does not implement persistence or change those controls' behavior.
