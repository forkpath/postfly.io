# Server test fixtures

Node-only helpers for isolated backend integration and E2E tests. Import through
`@libs/testing-server` from test files. Never import this library into production
code. Fixtures fail before writing unless the test runner supplies a matching
local `ray_test_<run-id>` database.

See [the backend testing guide](../../docs/development/testing-backend.md).
