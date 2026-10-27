# Admin performance investigation — 27 October 2026

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
