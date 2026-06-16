"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { microsToDollar } from "@/lib/google-ads/utils";
import type { KeywordIdea } from "@/lib/types";

interface KeywordTableProps {
  ideas: KeywordIdea[];
  selected: string[];
  onToggle: (keyword: string) => void;
  onAddSelected: () => void;
}

export function KeywordTable({ ideas, selected, onToggle, onAddSelected }: KeywordTableProps) {
  if (ideas.length === 0) {
    return <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">Keyword ideas will appear here after Keyword Planner returns suggestions.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex h-10 items-center justify-between border-b border-border px-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Keyword Planner suggestions</p>
        <Button size="sm" onClick={onAddSelected} disabled={selected.length === 0}>Add selected</Button>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2">Add</th>
              <th className="px-3 py-2">Keyword</th>
              <th className="px-3 py-2">Monthly searches</th>
              <th className="px-3 py-2">Competition</th>
              <th className="px-3 py-2">Top bid low</th>
              <th className="px-3 py-2">Top bid high</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ideas.map((idea) => (
              <tr key={idea.keyword} className="hover:bg-muted/40">
                <td className="px-3 py-2"><Checkbox checked={selected.includes(idea.keyword)} onCheckedChange={() => onToggle(idea.keyword)} /></td>
                <td className="px-3 py-2 font-medium text-foreground">{idea.keyword}</td>
                <td className="px-3 py-2">{idea.avgMonthlySearches.toLocaleString()}</td>
                <td className="px-3 py-2">{idea.competitionIndex}</td>
                <td className="px-3 py-2">{microsToDollar(idea.lowTopOfPageBidMicros)}</td>
                <td className="px-3 py-2">{microsToDollar(idea.highTopOfPageBidMicros)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
