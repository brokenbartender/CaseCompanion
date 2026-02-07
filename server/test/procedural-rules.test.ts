import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRuleDeadlines } from "../services/proceduralRules.js";

test("computes Michigan summons and answer deadlines", () => {
  const profile = {
    jurisdictionId: "mi",
    courtLevel: "district",
    county: "Wayne",
    filingDate: "2026-02-01",
    serviceDate: "2026-02-10",
    answerDate: "",
    discoveryServedDate: "",
    motionServedDate: "",
    pretrialDate: ""
  };
  const { deadlines } = computeRuleDeadlines(profile, [], [], null);
  const summons = deadlines.find((d) => d.rule.id === "summons-91");
  const answer = deadlines.find((d) => d.rule.id === "answer-21");
  assert.ok(summons);
  assert.ok(answer);
  assert.equal(summons?.dueDate, "2026-05-03");
  assert.equal(answer?.dueDate, "2026-03-03");
});

test("applies scheduling order override dueDate", () => {
  const profile = {
    jurisdictionId: "mi",
    courtLevel: "district",
    county: "Wayne",
    filingDate: "2026-02-01",
    serviceDate: "2026-02-10",
    answerDate: "",
    discoveryServedDate: "",
    motionServedDate: "",
    pretrialDate: "2026-03-01"
  };
  const overrides = JSON.stringify({
    "initial-disclosures": { dueDate: "2026-03-20" }
  });
  const { deadlines } = computeRuleDeadlines(profile, [], [], overrides);
  const initial = deadlines.find((d) => d.rule.id === "initial-disclosures");
  assert.equal(initial?.dueDate, "2026-03-20");
});
