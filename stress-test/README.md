# Stress Test Suite

Dong Cheng-Yu A0262348B

This folder contains 5 k6 stress tests.

All tests are configured as true stress tests with continuous ramp-up and abort-on-fail thresholds.

## Common Prerequisites

- Start backend at http://localhost:6060.
- Run commands from the repository root unless stated otherwise.
- Create a results folder before exporting summaries:
  - mkdir -p ./stress-test/results

## Test Summary

1. auth-stress.js
- Purpose: Stress the authentication journey and protected auth endpoints.
- Endpoints:
  - POST /api/v1/auth/register
  - POST /api/v1/auth/login
  - GET /api/v1/auth/user-auth
  - GET /api/v1/auth/admin-auth
  - PUT /api/v1/auth/profile

2. homepage-listing-stress.js
- Purpose: Stress homepage product/category listing and category filtering.
- Endpoints:
  - GET /api/v1/product/get-product
  - GET /api/v1/category/get-category
  - GET /api/v1/product/product-category/:slug

3. product-search-stress.js
- Purpose: Stress search -> detail -> related-product browsing journey.
- Endpoints:
  - GET /api/v1/product/search/:keyword
  - GET /api/v1/product/get-product/:slug
  - GET /api/v1/product/related-product/:pid/:cid

4. product-detail-stress.js
- Purpose: Stress detail loading (direct slug mode or search-first mode).
- Endpoints:
  - GET /api/v1/product/search/:keyword
  - GET /api/v1/product/get-product/:slug

5. payment-order-stress.js
- Purpose: Stress checkout/payment flow and order retrieval/update sequence.
- Endpoints:
  - GET /api/v1/product/get-product
  - GET /api/v1/product/braintree/token
  - POST /api/v1/product/braintree/payment
  - GET /api/v1/auth/orders
  - PUT /api/v1/auth/order-status/:orderId

## Example Commands

1. Auth stress
mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/auth-stress.js --env BASE_URL=http://localhost:6060 --env REUSE_USERS=true --env USER_POOL_FILE=./stress-test/auth-user-pool.generated.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env LOGIN_P95_ABORT_MS=999999 --env USER_AUTH_P95_ABORT_MS=999999 --env PROFILE_P95_ABORT_MS=999999 --summary-export ./stress-test/results/auth-stress-summary.json

2. Homepage listing stress
mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/homepage-listing-stress.js --env BASE_URL=http://localhost:6060 --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env HOMEPAGE_P95_ABORT_MS=999999 --env CATEGORY_LIST_P95_ABORT_MS=999999 --env CATEGORY_FILTER_P95_ABORT_MS=999999 --env JOURNEY_P95_ABORT_MS=999999 --summary-export ./stress-test/results/homepage-listing-stress-summary.json

3. Product search stress
mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/product-search-stress.js --env BASE_URL=http://localhost:6060 --env KEYWORDS_FILE=./stress-test/product-search-keywords.csv --env FAIL_RATE_ABORT=0.05 --env SEARCH_P95_ABORT_MS=999999 --env JOURNEY_P95_ABORT_MS=999999 --summary-export ./stress-test/results/product-search-stress-summary.json

4. Product detail stress
mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/product-detail-stress.js --env BASE_URL=http://localhost:6060 --env SEARCH_SEEDS_FILE=./stress-test/product-detail-search-seeds.csv --env SLUGS_FILE=./stress-test/product-detail-slugs.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env DETAIL_P95_ABORT_MS=999999 --env SEARCH_P95_ABORT_MS=999999 --summary-export ./stress-test/results/product-detail-stress-summary.json

5. Payment/order stress
mkdir -p ./stress-test/results && K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s k6 run ./stress-test/payment-order-stress.js --env BASE_URL=http://localhost:6060 --env REUSE_USERS=true --env USER_POOL_FILE=./stress-test/auth-user-pool.generated.csv --env START_RATE=10 --env RATE_STEP=5 --env STEP_DURATION_SEC=15 --env MAX_STEPS=39 --env FAIL_RATE_ABORT=0.05 --env PAYMENT_P95_ABORT_MS=999999 --env ORDERS_P95_ABORT_MS=999999 --env STATUS_P95_ABORT_MS=999999 --summary-export ./stress-test/results/payment-order-stress-summary.json

## Notes

- Exit code 99 usually means a threshold was crossed (expected behavior for stress-stop), not a script syntax crash.
- If REUSE_USERS=true but users in USER_POOL_FILE do not exist in the target database, login/auth steps will fail early (often 401), and the run may abort quickly due to failure-rate thresholds.
