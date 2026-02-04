import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "../components/ui/Card";
import { MICHIGAN_OBJECTION_CARDS } from "../data/michiganEvidenceObjections";

export default function ObjectionBattleCards() {
  return (
    <Page title="Objection Battle Cards" subtitle="Quick reference for common objections (informational only).">
      <div className="grid gap-6 md:grid-cols-2">
        {MICHIGAN_OBJECTION_CARDS.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <CardSubtitle>{card.rule}</CardSubtitle>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-slate-300">When to use:</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {card.whenToUse.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-slate-400">
                Sources:
                <ul className="mt-1 space-y-1">
                  {card.sources.map((src) => (
                    <li key={src.url}>
                      <a className="text-amber-300 hover:text-amber-200" href={src.url} target="_blank" rel="noreferrer">
                        {src.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
