import { test } from "node:test";
import assert from "node:assert/strict";
import { scanTextForPii } from "../services/piiScanService.js";

test("detects common PII patterns", () => {
  const text = "SSN 123-45-6789 DOB 01/20/1984 Account 1234567890";
  const findings = scanTextForPii(text);
  const labels = findings.map((f) => f.pattern);
  assert.ok(labels.includes("SSN"));
  assert.ok(labels.includes("DOB"));
  assert.ok(labels.includes("BankAccount"));
});

test("does not flag short numeric tokens", () => {
  const text = "Invoice 12345 total $120.00";
  const findings = scanTextForPii(text);
  assert.equal(findings.length, 0);
});
