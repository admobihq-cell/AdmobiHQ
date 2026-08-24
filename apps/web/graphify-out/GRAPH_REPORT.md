# Graph Report - web  (2026-08-24)

## Corpus Check
- 196 files · ~355,988 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2654 nodes · 8392 edges · 166 communities (109 shown, 57 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 1154 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d3b038b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- _
- s
- p
- f
- container.tsx
- site.ts
- pricing-data.ts
- blog-post.tsx
- drivers-client.tsx
- scripts
- push
- c
- help-queries.ts
- e
- c
- n
- design-system/page.tsx
- t
- fi
- r
- v
- b
- Gr
- wt
- warn
- __getNativeTag
- t
- global-not-found.tsx
- cc
- n
- .createInstance
- devDependencies
- o
- f
- l
- fr
- vn
- payload-types.ts
- vi
- u
- EmailLayout.tsx
- next.config.mjs
- so
- components.json
- email/config.ts
- include
- resolve-database-url.ts
- h
- Ke
- delete
- payload.config.ts
- ld
- as
- Pricing: Admobi (Kenya digital OOH)
- legal-page.tsx
- .__getValue
- y
- opengraph-illustration.tsx
- .forEach
- w
- seed-blog.ts
- [[...segments]]/page.tsx
- ts
- processNext
- .render
- remove
- Ht
- BlogPosts.ts
- .toString
- .get
- __debouncedOnEnd
- ns
- dependencies
- zn
- i
- Qt
- 20260601_164908.ts
- _startListeningToNativeValueUpdates
- fix-importmap.ts
- [...slug]/route.ts
- whatsapp-fab.tsx
- .updateEvents
- HelpArticles.ts
- ._isNestedWithSameOrientation
- mapChildrenToProps
- apple-icon.tsx
- icon.tsx
- sentry-example-page/page.tsx
- instrumentation.ts
- cloud-storage-client-utilities.js
- package.json
- Database migrations
- manageStateFrameCallback
- alpha
- vibrate
- logo/route.tsx
- (payload)/not-found.tsx
- sentry-example-page/layout.tsx
- applyWithGuard
- deactivateAndFlush
- contrast
- ._scheduleCellsToRenderUpdate
- sendEnvelope
- bull
- dotenv
- graphql
- @hookform/resolvers
- lucide-react
- next
- next-sitemap
- payload
- @payload-bites/image-search
- @payloadcms/db-postgres
- @payloadcms/next
- @payloadcms/richtext-lexical
- @payloadcms/storage-vercel-blob
- @payloadcms/ui
- @prisma/adapter-pg
- @prisma/client
- react
- react-hook-form
- redis
- resend
- @sentry/nextjs
- sharp
- @vercel/analytics
- @vercel/functions
- @vercel/speed-insights
- @workspace/ops-api-client
- @workspace/sentry-config
- @workspace/ui
- zod
- .registerFrameCallback
- setFlag

## God Nodes (most connected - your core abstractions)
1. `_` - 739 edges
2. `s()` - 190 edges
3. `t()` - 181 edges
4. `n()` - 172 edges
5. `c()` - 168 edges
6. `o()` - 156 edges
7. `n()` - 142 edges
8. `push()` - 134 edges
9. `o()` - 133 edges
10. `l()` - 131 edges

## Surprising Connections (you probably didn't know these)
- `generateMetadata()` --calls--> `getMediaAlt()`  [EXTRACTED]
  app/(marketing)/blog/[slug]/page.tsx → lib/payload/media-url.ts
- `generateMetadata()` --calls--> `getMediaUrl()`  [EXTRACTED]
  app/(marketing)/blog/[slug]/page.tsx → lib/payload/media-url.ts
- `onSubmit()` --calls--> `submit()`  [EXTRACTED]
  app/(marketing)/drivers/drivers-client.tsx → components/forms/use-lead-form.ts
- `generateMetadata()` --calls--> `pageMetadata()`  [EXTRACTED]
  app/(marketing)/help/[slug]/page.tsx → lib/seo/site.ts
- `MarketingLayout()` --calls--> `getRecentBlogPosts()`  [EXTRACTED]
  app/(marketing)/layout.tsx → lib/payload/blog-queries.ts

## Import Cycles
- None detected.

## Communities (166 total, 57 thin omitted)

### Community 0 - "_"
Cohesion: 0.01
Nodes (78): _, addBreadcrumb(), backIndex(), bd(), blur(), blurTextInput(), bubbles(), cancel() (+70 more)

### Community 1 - "s"
Cohesion: 0.03
Nodes (5): configureNextLayoutAnimation(), fetchNativeRelease(), getStateForHref(), s(), c()

### Community 2 - "p"
Cohesion: 0.07
Nodes (26): afterAllSetup(), emitChange(), H(), getState(), ie(), j(), C(), D() (+18 more)

### Community 3 - "f"
Cohesion: 0.08
Nodes (61): a(), Ae(), be(), Br(), Ce(), cu(), De(), du() (+53 more)

### Community 4 - "container.tsx"
Cohesion: 0.05
Nodes (43): metadata, leftTryables, metadata, rightTryables, tryables, AppDemoSection(), tryables, AudiencesSection() (+35 more)

### Community 5 - "site.ts"
Cohesion: 0.06
Nodes (44): metadata, metadata, fontMono, geist, MarketingLayout(), metadata, revalidate, metadata (+36 more)

### Community 6 - "pricing-data.ts"
Cohesion: 0.06
Nodes (50): metadata, BikeSimulator(), ZoneChoiceId, zoneChoices, clampInt(), NumberStepper(), DOT_GRID, DotMapVariant (+42 more)

### Community 7 - "blog-post.tsx"
Cohesion: 0.06
Nodes (45): BlogCard(), BlogCardProps, BlogIndex(), BlogIndexProps, BlogPostView(), BlogPostViewProps, formatDate(), truncateHeadline() (+37 more)

### Community 8 - "drivers-client.tsx"
Cohesion: 0.06
Nodes (40): DriversClient(), handleReset(), onSubmit(), eligibility, heroSteps, termsCards, MediaKitPage(), handleReset() (+32 more)

### Community 9 - "scripts"
Cohesion: 0.04
Nodes (50): scripts, build, cms:bootstrap:ci, db:announcements-image, db:announcements-soft-delete, db:audit-fixes, db:driver-notifications, db:driver-profiles (+42 more)

### Community 10 - "push"
Cohesion: 0.09
Nodes (37): apply(), At(), bn(), bt(), cf(), Ct(), dt(), ef() (+29 more)

### Community 11 - "c"
Cohesion: 0.06
Nodes (30): c(), b(), l(), S(), u(), w(), clearInteractionHandle(), createInteractionHandle() (+22 more)

### Community 12 - "help-queries.ts"
Cohesion: 0.09
Nodes (41): BlogPage(), metadata, revalidate, BlogPostPage(), generateMetadata(), generateStaticParams(), PageProps, revalidate (+33 more)

### Community 13 - "e"
Cohesion: 0.10
Nodes (5): closeNativeSdk(), e(), g(), getOptions(), Hr()

### Community 14 - "c"
Cohesion: 0.07
Nodes (31): a(), appendToDom(), bc(), createWidget(), o(), digestStringAsync(), f(), get() (+23 more)

### Community 15 - "n"
Cohesion: 0.16
Nodes (13): add(), v(), computeViewableItems(), getDelayFunction(), l(), onUpdate(), _onUpdateSync(), o() (+5 more)

### Community 16 - "design-system/page.tsx"
Cohesion: 0.08
Nodes (32): CoverSheet(), TITLE_BLOCK, metadata, RailNavDesktop(), RailNavMobile(), SHEETS, useActiveSheet(), onScroll() (+24 more)

### Community 17 - "t"
Cohesion: 0.08
Nodes (25): addListener(), ao(), co(), _dispatchEvent(), ee(), eo(), ep(), e() (+17 more)

### Community 18 - "fi"
Cohesion: 0.09
Nodes (43): ai(), Al(), Ba(), ci(), cl(), ei(), El(), fi() (+35 more)

### Community 19 - "r"
Cohesion: 0.08
Nodes (34): ar(), bf(), cd(), cr(), es(), fn(), ga(), go() (+26 more)

### Community 20 - "v"
Cohesion: 0.07
Nodes (6): alert(), currentlyFocusedField(), fetchNativePackageName(), measureLayout(), v(), u()

### Community 21 - "b"
Cohesion: 0.08
Nodes (4): b(), setup(), p(), I()

### Community 22 - "Gr"
Cohesion: 0.12
Nodes (6): Gr(), Pn(), rs(), ss(), yr(), ys()

### Community 23 - "wt"
Cohesion: 0.07
Nodes (5): gt(), Kt(), wt(), xt(), yt()

### Community 24 - "warn"
Cohesion: 0.07
Nodes (17): captureReplay(), captureScreenshot(), checkConfig(), controlledBottomTabs(), d(), encodeToBase64(), error(), fetchNativeAppStart() (+9 more)

### Community 25 - "__getNativeTag"
Cohesion: 0.08
Nodes (6): __addChild(), __getNativeTag(), __getPlatformConfig(), __removeChild(), __startNativeAnimation(), stop()

### Community 27 - "global-not-found.tsx"
Cohesion: 0.08
Nodes (21): fontMono, geist, GlobalNotFound(), metadata, metadata, columns, SiteFooter(), SiteHeader() (+13 more)

### Community 28 - "cc"
Cohesion: 0.11
Nodes (31): ac(), Au(), ca(), cc(), dc(), dd(), er(), fc() (+23 more)

### Community 30 - ".createInstance"
Cohesion: 0.07
Nodes (4): delay(), duration(), reduceMotion(), withCallback()

### Community 31 - "devDependencies"
Cohesion: 0.07
Nodes (27): cli-color, cross-env, dotenv-cli, devDependencies, cli-color, cross-env, dotenv-cli, eslint (+19 more)

### Community 32 - "o"
Cohesion: 0.08
Nodes (3): assert(), fetchViewHierarchy(), o()

### Community 34 - "l"
Cohesion: 0.08
Nodes (4): fetchNativeDeviceContexts(), fetchNativeSdkInfo(), l(), i()

### Community 35 - "fr"
Cohesion: 0.15
Nodes (9): bs(), dr(), fr(), ks(), Ln(), or(), qs(), vs() (+1 more)

### Community 36 - "vn"
Cohesion: 0.12
Nodes (8): cn(), dn(), gn(), hn(), kn(), On(), un(), vn()

### Community 37 - "payload-types.ts"
Cohesion: 0.09
Nodes (22): Auth, BlogPost, BlogPostsSelect, CollectionsWidget, Config, GeneratedTypes, HelpArticlesSelect, HelpCategoriesSelect (+14 more)

### Community 38 - "vi"
Cohesion: 0.11
Nodes (23): af(), bi(), bl(), bu(), di(), dl(), ea(), gi() (+15 more)

### Community 40 - "EmailLayout.tsx"
Cohesion: 0.14
Nodes (12): AdminAlertProps, typeLabels, CampaignConfirmationProps, DriverConfirmationProps, FleetPartnerConfirmationProps, emailColors, emailFonts, emailStyles (+4 more)

### Community 41 - "next.config.mjs"
Cohesion: 0.11
Nodes (15): fetchBlogSitemapPaths(), fetchHelpSitemapPaths(), CONTENT_SIGNAL_HEADER, enhanceRobotsTxt(), ROBOTS_AI_SEARCH_SECTION, ROBOTS_AI_SEARCH_USER_AGENTS, appDir, CLIENT_NODE_FALLBACKS (+7 more)

### Community 42 - "so"
Cohesion: 0.13
Nodes (13): bo(), eu(), fo(), getLoadedFonts(), jo(), jr(), no(), nu() (+5 more)

### Community 43 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+11 more)

### Community 44 - "email/config.ts"
Cohesion: 0.18
Nodes (14): DEFAULT_ADMIN_EMAILS, getAdminEmails(), getSenderEmail(), parseEmailList(), resolveRecipient(), resolveRecipients(), getEmailQueue(), startProcessor() (+6 more)

### Community 45 - "include"
Cohesion: 0.11
Nodes (18): next.config.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, ../../packages/ui/src/*, ./payload.config.ts, **/*.ts, **/*.tsx (+10 more)

### Community 46 - "resolve-database-url.ts"
Cohesion: 0.18
Nodes (13): url, webRoot, adapter, createPool(), globalForPrisma, prisma, BUILD_PLACEHOLDER_DATABASE_URL, isBuildTimeWithoutDatabase() (+5 more)

### Community 48 - "Ke"
Cohesion: 0.14
Nodes (8): create(), _initializeGestureState(), Ke(), preventDefault(), Qf(), rt(), n(), stopPropagation()

### Community 49 - "delete"
Cohesion: 0.14
Nodes (5): addChangeListener(), delete(), resetServerContext(), set(), xd()

### Community 51 - "payload.config.ts"
Cohesion: 0.16
Nodes (11): dirname, filename, Media, Users, patchVercelBlobClientImport(), VERCEL_BLOB_CLIENT_HANDLER, VERCEL_BLOB_CLIENT_HANDLER_STUB, blobToken (+3 more)

### Community 52 - "ld"
Cohesion: 0.16
Nodes (15): ad(), cs(), ed(), hd(), ld(), nd(), pa(), Pd() (+7 more)

### Community 53 - "as"
Cohesion: 0.24
Nodes (15): as(), ds(), fs(), hs(), In(), is(), ji(), ki() (+7 more)

### Community 54 - "Pricing: Admobi (Kenya digital OOH)"
Cohesion: 0.13
Nodes (14): Add-ons (quote on brief), All screens, Delivery bike enclosures: per-side/day formula, Enterprise & exclusivity, Pricing: Admobi (Kenya digital OOH), Sides multiplier (sub-linear), Slot length multiplier (sub-linear), Taxi-top LED: spot/play formula (+6 more)

### Community 55 - "legal-page.tsx"
Cohesion: 0.19
Nodes (8): metadata, sections, metadata, sections, GridBackground(), LegalPage(), LegalPageProps, slugify()

### Community 58 - "opengraph-illustration.tsx"
Cohesion: 0.26
Nodes (9): GET(), runtime, getSuvDataUri(), getTypemarkDataUri(), OgHeroIllustration(), OgHeroIllustrationProps, readAsDataUri(), createOpenGraphImageResponse() (+1 more)

### Community 60 - ".forEach"
Cohesion: 0.17
Nodes (3): insert(), queryCache(), updateEventHandler()

### Community 62 - "seed-blog.ts"
Cohesion: 0.23
Nodes (11): BlogTopic, createCoverImage(), ensureCoverMedia(), findPostBySlug(), heading(), paragraph(), seed(), SEED_POSTS (+3 more)

### Community 63 - "[[...segments]]/page.tsx"
Cohesion: 0.21
Nodes (4): importMap, Args, Args, VercelBlobClientUploadHandler()

### Community 65 - "processNext"
Cohesion: 0.20
Nodes (10): cancelTasks(), enqueue(), enqueueTasks(), _genPromise(), _getCurrentQueue(), hasTasksToProcess(), processNext(), run() (+2 more)

### Community 67 - "remove"
Cohesion: 0.18
Nodes (6): current(), s(), onReady(), remove(), removeFromDom(), setFocusedState()

### Community 69 - "BlogPosts.ts"
Cohesion: 0.33
Nodes (6): BlogPosts, HelpCategories, revalidateBlogAfterChange(), revalidateBlogAfterDelete(), revalidateBlogPaths(), slugFromTitle()

### Community 71 - ".get"
Cohesion: 0.29
Nodes (5): addEventListener(), jf(), listen(), removeEventListener(), n()

### Community 74 - "dependencies"
Cohesion: 0.22
Nodes (9): antd, dependencies, antd, pg, react-dom, react-email, pg, react-dom (+1 more)

### Community 80 - "_startListeningToNativeValueUpdates"
Cohesion: 0.29
Nodes (6): hasListeners(), __makeNative(), __onAnimatedValueUpdateReceived(), removeAllListeners(), _startListeningToNativeValueUpdates(), _stopListeningForNativeValueUpdates()

### Community 81 - "fix-importmap.ts"
Cohesion: 0.29
Nodes (6): BLOB_IMPORT_PATTERNS, importMapPath, source, FORBIDDEN, importMapPath, verifyImportMap()

### Community 82 - "[...slug]/route.ts"
Cohesion: 0.29
Nodes (6): DELETE, GET, OPTIONS, PATCH, POST, PUT

### Community 83 - "whatsapp-fab.tsx"
Cohesion: 0.38
Nodes (5): SUPPRESSED_ON, WhatsappFab(), GtagFn, trackEvent(), Window

### Community 85 - "HelpArticles.ts"
Cohesion: 0.60
Nodes (4): HelpArticles, revalidateHelpAfterChange(), revalidateHelpAfterDelete(), revalidateHelpPaths()

### Community 87 - "mapChildrenToProps"
Cohesion: 0.33
Nodes (6): flattenArrayTypeChildren(), mapArrayTypeChildrenToProps(), mapChildrenToProps(), mapNestedChildrenToProps(), mapObjectTypeChildren(), warnOnInvalidChildren()

### Community 89 - "apple-icon.tsx"
Cohesion: 0.40
Nodes (3): contentType, runtime, size

### Community 90 - "icon.tsx"
Cohesion: 0.40
Nodes (3): contentType, runtime, size

### Community 93 - "cloud-storage-client-utilities.js"
Cohesion: 0.60
Nodes (3): getFileKey(), getFilePrefix(), sanitizePrefix()

### Community 94 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 95 - "Database migrations"
Cohesion: 0.40
Nodes (4): Applying migrations to staging or production, Database migrations, Day to day (local/dev), One-time cutover (per environment, already done once you've run it)

### Community 96 - "manageStateFrameCallback"
Cohesion: 0.40
Nodes (3): manageStateFrameCallback(), runCallbacks(), unregisterFrameCallback()

### Community 99 - "alpha"
Cohesion: 0.50
Nodes (4): alpha(), fade(), mix(), opaquer()

### Community 101 - "vibrate"
Cohesion: 0.50
Nodes (4): impactAsync(), notificationAsync(), selectionAsync(), vibrate()

### Community 105 - "applyWithGuard"
Cohesion: 0.67
Nodes (3): applyWithGuard(), guard(), reportError()

### Community 106 - "deactivateAndFlush"
Cohesion: 0.67
Nodes (3): computeBlankness(), deactivateAndFlush(), _resetData()

### Community 107 - "contrast"
Cohesion: 0.67
Nodes (3): contrast(), level(), luminosity()

### Community 110 - "sendEnvelope"
Cohesion: 0.67
Nodes (3): _processItem(), _processLevels(), sendEnvelope()

## Knowledge Gaps
- **361 isolated node(s):** `revalidate`, `PageProps`, `revalidate`, `metadata`, `TITLE_BLOCK` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_` connect `_` to `s`, `p`, `f`, `push`, `c`, `e`, `c`, `n`, `t`, `fi`, `r`, `v`, `b`, `Gr`, `wt`, `warn`, `__getNativeTag`, `.registerFrameCallback`, `setFlag`, `cc`, `n`, `.createInstance`, `t`, `o`, `f`, `l`, `fr`, `vn`, `vi`, `u`, `so`, `h`, `Ke`, `delete`, `._handleAnimatedStylesUpdate`, `ld`, `as`, `.__getValue`, `y`, `.forEach`, `w`, `ts`, `processNext`, `.render`, `remove`, `Ht`, `.toString`, `.get`, `__debouncedOnEnd`, `ns`, `zn`, `i`, `Qt`, `_startListeningToNativeValueUpdates`, `.updateEvents`, `._isNestedWithSameOrientation`, `mapChildrenToProps`, `manageStateFrameCallback`, `alpha`, `vibrate`, `applyWithGuard`, `deactivateAndFlush`, `contrast`, `._scheduleCellsToRenderUpdate`, `sendEnvelope`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Why does `s()` connect `s` to `_`, `p`, `f`, `push`, `c`, `e`, `c`, `n`, `t`, `fi`, `.render`, `v`, `b`, `r`, `.registerFrameCallback`, `warn`, `__getNativeTag`, `setFlag`, `n`, `o`, `f`, `l`, `h`, `delete`, `._handleAnimatedStylesUpdate`, `.__getValue`, `y`, `.forEach`, `w`, `.toString`, `.get`, `.updateEvents`, `manageStateFrameCallback`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `n()` connect `n` to `_`, `p`, `f`, `push`, `c`, `e`, `c`, `n`, `t`, `r`, `v`, `b`, `warn`, `__getNativeTag`, `.createInstance`, `f`, `l`, `h`, `Ke`, `delete`, `.forEach`, `remove`, `.toString`, `.get`, `_startListeningToNativeValueUpdates`, `.registerKeyframesUsage`, `._performTransitionSideEffects`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `_` (e.g. with `a()` and `u()`) actually correct?**
  _`_` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `s()` (e.g. with `f()` and `g()`) actually correct?**
  _`s()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 79 inferred relationships involving `t()` (e.g. with `addListener()` and `afterAllSetup()`) actually correct?**
  _`t()` has 79 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `n()` (e.g. with `add()` and `Ae()`) actually correct?**
  _`n()` has 87 INFERRED edges - model-reasoned connections that need verification._