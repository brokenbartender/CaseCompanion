const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const extractHour = (timestamp) => {
  const date = new Date(timestamp || "");
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours();
};

const toLower = (value) => String(value || "").toLowerCase();

const buildAdmissibilityScore = (row) => {
  let score = 92;
  const tips = [];

  if (!row.hash) {
    score -= 35;
    tips.push("Re-verify source checksum to restore integrity score.");
  }
  if (row.event.toLowerCase().includes("login") && row.event.toLowerCase().includes("failed")) {
    score -= 20;
    tips.push("Review failed authentication attempts and rotate credentials.");
  }
  if (row.status === "TAMPERED") {
    score -= 40;
    tips.push("Initiate chain-of-custody remediation and re-ingest evidence.");
  }

  return {
    score: clamp(score, 0, 100),
    tip: tips[0] || "No remediation required."
  };
};

const buildNarrative = (row) => {
  const actor = row.actorId || "system";
  const resource = row.resource || "evidence asset";
  const timestamp = row.createdAt || "unknown time";
  const integrity = row.status === "VERIFIED" ? "remained unbroken" : "shows signs of compromise";

  return [
    `Evidence ${resource} was handled by ${actor} on ${timestamp}.`,
    `Digital signature ${row.signature ? "was recorded" : "was missing"} and chain integrity ${integrity}.`,
    `Previous hash link ${row.prevHash ? "was preserved" : "was unavailable"} for this custody event.`
  ].join(" ");
};

const analyzeRows = (rows) => {
  const insights = [];
  const predicted = [];
  const actorCounts = new Map();

  rows.forEach((row) => {
    const actor = row.actorId || "system";
    actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
  });

  rows.forEach((row) => {
    const hour = extractHour(row.createdAt);
    if (hour !== null && (hour < 5 || hour > 22)) {
      insights.push({
        id: `${row.id}-temporal`,
        label: "Temporal Anomaly",
        detail: `Activity recorded at ${hour}:00 for ${row.resource || "record"}.`,
        confidence: 86
      });
    }
    if ((actorCounts.get(row.actorId || "system") || 0) >= 6) {
      insights.push({
        id: `${row.id}-volume`,
        label: "Volume Anomaly",
        detail: `High volume access by ${row.actorId || "system"}.`,
        confidence: 78
      });
    }
    if (row.status === "TAMPERED") {
      predicted.push({
        id: `${row.id}-predicted`,
        label: "Predicted Threat",
        detail: "Potential policy breach escalation detected.",
        confidence: 74
      });
    }
  });

  return { insights: insights.slice(0, 6), predicted: predicted.slice(0, 4) };
};

const queryRows = (rows, query) => {
  const needle = toLower(query);
  if (!needle) return { rows, matchIds: new Set(), summary: "No query provided." };

  const matchIds = new Set();
  const filtered = rows.filter((row) => {
    const hay = [
      row.event,
      row.actorId,
      row.resource,
      row.hash,
      row.signature,
      row.prevHash
    ].map(toLower).join(" ");
    const match = hay.includes(needle);
    if (match) matchIds.add(row.id);
    return match;
  });

  return {
    rows: filtered,
    matchIds,
    summary: filtered.length
      ? `AI Sentinel matched ${filtered.length} record(s) for "${query}".`
      : "No records matched the query."
  };
};

const fixtureAISentinel = {
  analyzeRows,
  buildAdmissibilityScore,
  buildNarrative,
  queryRows
};

export default fixtureAISentinel;
