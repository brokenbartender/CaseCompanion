import express from 'express';

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

export function createComplianceRouter() {
  const router = express.Router();

  router.post('/survey/generate', (req, res) => {
    const topic = String(req.body?.topic || 'General Compliance');
    const payload: Record<string, string> = {};
    STATES.forEach((abbr) => {
      payload[abbr] = `${abbr} Statute on ${topic}: See ${abbr} Code § 12-${abbr}-101 (mocked).`;
    });
    res.json({ topic, statutes: payload });
  });

  return router;
}
