# Cache budget

**Why this document exists:** the site's page cache is paid for in a currency we
have very little of, and the obvious way to configure it spends all of that
currency and buys nothing.

## The constraint

Cloudflare Workers KV on the **free** plan allows roughly **1,000 writes a day**.
Confirmed directly, 2026-09-18, not inferred:

```
$ wrangler kv key put --namespace-id c9cf54ced0214def91278f73f69316bd "probe" "probe" --remote
your account has reached the free usage limit for this operation for today [code: 10048]
```

The billing page shows **Workers · Workers Free · Active**. The owner has decided
not to upgrade until the project earns money, so this is the budget we design
against, not a problem waiting for a cheque.

Each cached page costs **two** writes — one `:html` key and one `:rsc` key — and
**every deploy invalidates all of them**, because the keys are
`cache:app:<build-uuid>:<path>:html`.

## What went wrong before

`app/layout.tsx` exported `revalidate = 86400`. That applies to every route, so
all **649** pages tried to cache themselves: about **1,298 writes** against an
allowance of 1,000.

The result was the worst of both worlds. The writes failed, so nothing was ever
cached; and because the routes were nonetheless classified as cacheable-pending,
production served `cache-control: no-store, must-revalidate` on every page. The
site paid the whole quota and served every request uncached — which is exactly
the state that produced **1,316 `exceededResources` 503s in one hour** under
crawl load on 2026-09-16.

## What we do instead

**Caching is opted into per page, and only where it pays.** `app/layout.tsx`
sets no `revalidate` at all; each page that should be cached exports its own.

| What | Pages | Writes |
|---|---|---|
| Tool pages, homepage, hubs (static) | 43 | 86 |
| `/guides/category/:category` | 18 | 36 |
| **Total** | **61** | **122** |

122 writes against ~1,000 leaves room for **eight** full re-warms a day, so a
deploy no longer has to be rationed.

## What is deliberately not cached, and why

**The 550 `/guides/:slug` pages.** At two writes each they are 1,100 writes —
they do not fit inside a 1,000-write allowance *on their own*, at any setting.
There is no arrangement of the free plan that caches them. They render on
demand, which is what every page did before this change, so nothing is worse
than it was.

Verified locally: a guide page returns `x-vinext-cache: MISS` on every request
and never becomes a `HIT`, which means it is never stored and therefore **costs
no writes at all**. A cached page goes `MISS` then `HIT`.

**`app/blog/**`, `app/templates/**` and `app/support/**`** are Antigravity-owned
(board §2) and are not opted in by this change. Adding them would cost about 80
more writes and still fit comfortably; it is a request on the board, not
something to take unilaterally.

## The rule to keep

`lib/seo/cache-budget.test.ts` fails the build if the estimated write cost goes
over **900**, if `app/layout.tsx` ever sets a blanket `revalidate` again, or if
the guide long tail is opted in. Change the budget there and you have to mean it.

## If the plan is ever upgraded

Delete none of this — just raise the number in the test and opt more pages in.
The per-page approach is better than a blanket one regardless of plan, because
it makes the cost of each page visible.
