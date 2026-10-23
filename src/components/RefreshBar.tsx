import { ActionForm, SubmitButton } from "./ActionForm";
import { refreshStats } from "@/app/league/[id]/actions";
import { lastSync } from "@/server/sync";
import { ago } from "@/server/page";

export async function RefreshBar({ leagueId }: { leagueId: string }) {
  const last = await lastSync();
  return (
    <div className="card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0 text-xs text-muted">
        {last ? (
          <>
            <div className="font-semibold text-ink">Stats updated {ago(last.startedAt)}</div>
            <div>{last.ok === false ? "Last refresh failed" : last.by ? `by ${last.by}` : "automatic"}</div>
          </>
        ) : (
          <div className="font-semibold text-ink">Stats haven't been loaded yet</div>
        )}
      </div>
      <ActionForm action={refreshStats.bind(null, leagueId)} inline>
        <SubmitButton className="btn btn-ghost btn-sm" pendingText="Refreshing…">Refresh stats</SubmitButton>
      </ActionForm>
    </div>
  );
}
