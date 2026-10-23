import { ActionForm, SubmitButton } from "./ActionForm";
import { refreshStats } from "@/app/league/[id]/actions";
import { lastSync } from "@/server/sync";
import { ago } from "@/server/page";

export async function RefreshBar({ leagueId }: { leagueId: string }) {
  const last = await lastSync();
  return (
    <div className="card">
      <div className="pad flex items-center justify-between gap-3">
        <div className="min-w-0 text-[13px]">
          {last ? (
            <>
              <div className="font-semibold">Stats updated {ago(last.startedAt)}</div>
              <div className="text-muted">{last.ok === false ? "Last refresh failed" : last.by ? `by ${last.by}` : "automatic"}</div>
            </>
          ) : (
            <div className="font-semibold">Stats haven&apos;t been loaded yet</div>
          )}
        </div>
        <ActionForm action={refreshStats.bind(null, leagueId)} inline>
          <SubmitButton className="pill sm" pendingText="Refreshing…">Refresh stats</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
