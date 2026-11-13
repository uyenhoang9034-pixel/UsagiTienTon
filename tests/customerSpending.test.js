import test from "node:test";
import assert from "node:assert/strict";
import { normalizeServiceDisplayName } from "../src/services/customerSpendingService.js";

test("Chinese and HSK variants normalize to Dạy Kèm Tiếng Trung", () => {
  for (const value of ["chinese", "Chinese", "CHINESE", "hsk", "HSK", "HSK 3", "Lớp Chinese giao tiếp"]) {
    assert.equal(normalizeServiceDisplayName(value), "Dạy Kèm Tiếng Trung");
  }
});

test("known service aliases normalize consistently", () => {
  assert.equal(normalizeServiceDisplayName("code bot discord"), "Vibe Code Bot Discord");
  assert.equal(normalizeServiceDisplayName("Vibe Code Bot"), "Vibe Code Bot Discord");
  assert.equal(normalizeServiceDisplayName("decor nitro"), "Nitro Decor");
});

test("unknown service notes preserve text except first-letter capitalization", () => {
  assert.equal(normalizeServiceDisplayName("netflix"), "Netflix");
  assert.equal(normalizeServiceDisplayName("làm banner server"), "Làm banner server");
});
