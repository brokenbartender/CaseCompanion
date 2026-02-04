import React from "react";
import Page from "../components/ui/Page";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";

export default function RBACEditor() {
  return (
    <Page title="RBAC Editor" subtitle="Role templates and permission matrix">
      <Card>
        <CardHeader><CardTitle>Role Matrix</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 text-xs uppercase">
              <tr>
                <th className="py-2">Role</th>
                <th className="py-2">View Evidence</th>
                <th className="py-2">Redact</th>
                <th className="py-2">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2">Partner</td>
                <td>?</td>
                <td>?</td>
                <td>?</td>
              </tr>
              <tr>
                <td className="py-2">Associate</td>
                <td>?</td>
                <td>? (limited)</td>
                <td>?</td>
              </tr>
              <tr>
                <td className="py-2">Client</td>
                <td>? (read-only)</td>
                <td>?</td>
                <td>?</td>
              </tr>
            </tbody>
          </table>
        </CardBody>
      </Card>
    </Page>
  );
}
