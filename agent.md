# Jest Unit Test Agent Guide

This document defines how an AI/code agent should design and write **high-quality Jest unit tests** in this repository.

## 0) Jest-Specific Baseline (Required)

- Write tests with Jest primitives: `describe`, `it`/`test`, `expect`.
- Keep test files in Jest-discoverable formats (e.g., `*.test.js`, `*.spec.js`).
- Group related cases in `describe` blocks by module/function/behavior.
- Use lifecycle hooks intentionally: `beforeEach`, `afterEach`, `beforeAll`, `afterAll`.
- Always clean test state:
  - `jest.clearAllMocks()` to clear call history,
  - `jest.restoreAllMocks()` when using spies,
  - reset modules only when needed via `jest.resetModules()`.
- Prefer deterministic tests over snapshot-heavy tests for core business logic.

## 1) Core Principle: Test Correctness, Not Current Logic

- Treat existing implementation as potentially wrong.
- Derive expected behavior from:
  - requirements/specs,
  - API contracts,
  - domain rules,
  - user-visible behavior,
  - invariants and constraints.
- Never encode implementation bugs as expected outcomes.
- If behavior is ambiguous, do **not** silently guess.

### Assumptions Policy

If assumptions are needed to proceed:

1. Make assumptions explicit in test names or comments where relevant.
2. Keep assumptions minimal and falsifiable.
3. In the final/concluding prompt, include an **Assumptions** section listing all assumptions made.

---

## 2) Mandatory Test Design Strategies

Every meaningful unit-tested function/module should be covered using all applicable strategies below.

### A. Boundary Value Analysis (BVA)

Cover values at and around boundaries:

- minimum, just below minimum, minimum valid,
- nominal mid values,
- maximum valid, just above maximum,
- empty/null/undefined where applicable,
- length/count boundaries (e.g., 0, 1, max-1, max, max+1).

### B. Equivalence Partitioning

Identify distinct input classes and test representative values from each:

- valid partitions,
- invalid partitions,
- special-format partitions (e.g., malformed, unsupported type, out-of-domain).

### C. Decision Tables

For logic with multiple conditions/rules:

- enumerate condition combinations,
- map each combination to expected action/outcome,
- ensure each rule/column has at least one test,
- include precedence/conflict handling when rules overlap.

### D. State Machine Testing

For stateful behavior:

- define states, events, transitions,
- test valid transitions,
- test invalid/forbidden transitions,
- verify side effects and resulting state after each transition,
- include reset/recovery/error states where relevant.

---

## 3) Test Structure: AAA Pattern (Required)

Use **Arrange → Act → Assert** consistently.

- **Arrange**: set up inputs, Jest mocks/spies, fixtures, and system-under-test.
- **Act**: execute one focused behavior (often one function call).
- **Assert**: verify outputs, side effects, and interactions with `expect` matchers.

Rules:

- One primary behavior per test.
- Keep Arrange concise and reusable through helpers/fixtures.
- Avoid assertions in Arrange/Act blocks.
- Prefer explicit assertions over snapshot-only checks for business-critical logic.

Jest tips:

- For async success: `await expect(promise).resolves...`
- For async failure: `await expect(promise).rejects...`
- For thrown errors: `expect(() => fn()).toThrow(...)`

---

## 4) Test Doubles and Data Setup

Use **mocks, stubs, and fixtures** intentionally.

### Mocks

Use mocks to verify interactions with external dependencies:

- DB/model calls,
- network clients,
- file system,
- auth/session providers,
- time/random generators.

Jest APIs to prefer:

- `jest.mock('module')` for module-level mocking,
- `jest.fn()` for lightweight function mocks,
- `jest.spyOn(object, 'method')` for partial mocking/verification.

Verify:

- called/not called via `toHaveBeenCalled()` / `not.toHaveBeenCalled()`,
- call count via `toHaveBeenCalledTimes(n)`,
- arguments via `toHaveBeenCalledWith(...)`,
- ordering (only when behaviorally relevant).

### Stubs

Use stubs to control dependency behavior deterministically:

- success paths,
- failures/errors,
- timeouts/retries,
- edge responses.

Jest stub patterns:

- `mockReturnValue(...)` / `mockReturnValueOnce(...)`,
- `mockResolvedValue(...)` / `mockResolvedValueOnce(...)`,
- `mockRejectedValue(...)` / `mockRejectedValueOnce(...)`,
- `mockImplementation(...)` for custom behavior.

### Fixtures

Use fixtures for readable, reusable test data:

- keep minimal but realistic,
- create factory helpers for variants,
- avoid over-coupling tests to massive shared fixtures,
- keep fixtures immutable within tests.

---

## 5) Additional Quality Instructions (Required)

### Test Quality Bar

- Deterministic: no flaky timing/race dependence.
- Fast: unit tests should run quickly and independently.
- Isolated: no real network, real DB, or shared mutable global state.
- Repeatable: order-independent and safe for parallel execution.

Jest timing controls:

- Prefer fake timers for time-based logic: `jest.useFakeTimers()`.
- Advance time explicitly: `jest.advanceTimersByTime(ms)`.
- Restore timers after each relevant suite/test: `jest.useRealTimers()`.

### Coverage Expectations

- Cover success, failure, and edge cases.
- Cover error paths and exception mapping.
- Cover input validation and security-relevant checks.
- Include regression tests for every bug fix.

### Assertions

- Assert behavior, not private implementation details.
- Prefer precise assertions (exact error message/code where part of contract).
- For async code, assert rejection/throw paths explicitly.
- Prefer explicit matchers (`toEqual`, `toStrictEqual`, `toMatchObject`, `toBe`) over broad checks.

### Naming and Readability

- Use descriptive test names in behavior form:
  - `should <expected outcome> when <condition>`
- Keep tests small and focused.
- Avoid duplicated setup by extracting helper builders/factories.

### Maintenance

- Remove or update obsolete tests when behavior changes intentionally.
- Keep tests aligned with product requirements and contracts.
- Do not “fix” failing tests by weakening assertions without rationale.

Jest hygiene:

- Avoid inter-test coupling through shared mutable fixtures.
- Use `describe.each` / `test.each` for concise partition and decision-table cases.
- Keep one assertion theme per test; split large mixed-behavior tests.

---

## 6) Minimum Checklist Before Finalizing

Before final output, verify:

- [ ] Correctness-based expectations (not implementation mirroring)
- [ ] BVA coverage
- [ ] Equivalence partition coverage
- [ ] Decision table coverage (if multi-condition logic exists)
- [ ] State transition coverage (if stateful behavior exists)
- [ ] AAA structure in each test
- [ ] Appropriate use of mocks/stubs/fixtures
- [ ] Jest mock lifecycle cleanup done (`clearAllMocks`/`restoreAllMocks` as needed)
- [ ] Positive, negative, and edge cases included
- [ ] Assumptions listed in concluding prompt

---

## 7) Concluding Prompt Template

Use this at the end of test-generation tasks:

```md
### Test Summary

- Added/updated unit tests for: <modules>
- Strategies used: BVA, Equivalence Partitioning, Decision Tables, State Machines (as applicable)
- Pattern used: AAA
- Test doubles used: mocks/stubs/fixtures

### Assumptions

- <assumption 1>
- <assumption 2>

### Notes

- Any uncovered risks or follow-up integration/e2e concerns.
```
