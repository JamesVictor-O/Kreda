# Underwriter agent

Four-stage pipeline: ingest → check → decide → commit. See `CLAUDE.md` at
the repo root for the product and architecture context.

## Data source

Ingestion is implemented against the Shopify Admin GraphQL API
(`app/data_provider/shopify_provider.py`, `app/shopify/`), but that path
hasn't been run against a live store — Shopify's custom-app token flow
changed in 2026 and getting a Partners development store connected wasn't
worth the debugging time against the submission deadline. It's also not
something you want depending on for a recorded demo: rate limits, network,
an expired token, and the demo breaks live.

So the demo and the entire test suite run against `app/data_provider/fixture_provider.py`
instead — seeded, generated `StoreSnapshot`s committed as JSON under
`tests/fixtures/generated/`. Both providers implement the same
`StoreDataProvider` interface (`app/data_provider/base.py`), and nothing
downstream of `app/stages/ingest.py` knows or cares which one served a
given snapshot.

Switch providers with `KREDA_DATA_PROVIDER=fixture|shopify` (see
`.env.example`). Default is `fixture`.

To see how the fixtures are built, or to regenerate them after changing a
scenario's parameters, start at `tests/fixtures/generator.py`.
