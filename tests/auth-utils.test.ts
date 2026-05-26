import test from "node:test";
import assert from "node:assert/strict";
import { hasAdminRole } from "../src/hooks/auth-utils.ts";

test("hasAdminRole returns true when admin role is present", () => {
  assert.equal(hasAdminRole([{ role: "user" }, { role: "admin" }]), true);
});

test("hasAdminRole returns false for empty or missing roles", () => {
  assert.equal(hasAdminRole([]), false);
  assert.equal(hasAdminRole(null), false);
  assert.equal(hasAdminRole(undefined), false);
});
