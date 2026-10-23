import { ActionForm, SubmitButton, type FormState } from "./ActionForm";
import { PlayerAvatar } from "./PlayerAvatar";
import { fmt1 } from "@/server/page";
import type { RecentGame, SeasonLine } from "@/server/playerStats";

export type CardPlayer = { name: string; imageUrl: string | null; teamAbbr: string | null; position: string | null; injuryStatus: string | null };

/** Photo, season averages, best game and last five games. Used in the draft room (and anywhere a player is inspected). */
export function PlayerCard({
  player,
  season,
  recent,
  draftAction,
}: {
  player: CardPlayer;
  season: SeasonLine;
  recent: RecentGame[];
  /** Present only when it's your turn to pick. */
  draftAction?: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const max = Math.max(1, ...recent.map((g) => g.fpts));
  const stats: [string, string, boolean][] = [
    ["FPTS", season.gp ? fmt1(season.fpts) : "–", true],
    ["HIGH", season.gp ? fmt1(season.high) : "–", true],
    ["GP", String(season.gp), false],
    ["PTS", season.gp ? fmt1(season.pts) : "–", false],
    ["REB", season.gp ? fmt1(season.reb) : "–", false],
    ["AST", season.gp ? fmt1(season.ast) : "–", false],
    ["STL", season.gp ? fmt1(season.stl) : "–", false],
    ["BLK", season.gp ? fmt1(season.blk) : "–", false],
    ["TOV", season.gp ? fmt1(season.tov) : "–", false],
  ];
  return (
    <div className="pcard">
      <div className="ph">
        <PlayerAvatar name={player.name} src={player.imageUrl} team={player.teamAbbr} size={84} />
        <div className="who">
          <div className="pn">{player.name}</div>
          <div className="ps2">
            {player.teamAbbr} · {player.position}
            {player.injuryStatus ? <> · <span className="inj">{player.injuryStatus}</span></> : null}
          </div>
        </div>
      </div>
      {draftAction ? (
        <ActionForm action={draftAction} className="pbtn">
          <SubmitButton className="pill solid block">Draft {player.name}</SubmitButton>
        </ActionForm>
      ) : null}
      <div className="statgrid">
        {stats.map(([k, v, hl]) => (
          <div key={k} className={hl ? "hl" : ""}><b className="tnum">{v}</b><span>{k}</span></div>
        ))}
      </div>
      <div className="ptip">High game matters: only one game per week counts under Lock-In.</div>
      <div className="sec" style={{ margin: "14px -16px 0" }}>
        <span>Last 5 games</span>
        <div className="cols" style={{ display: "flex" }}><span>PTS</span><span>REB</span><span>AST</span><span style={{ width: 48 }}>FPTS</span></div>
      </div>
      {recent.map((g, i) => (
        <div key={i} className="glog">
          <span className="opp">{g.label}</span>
          <i className="bar"><u style={{ width: `${(g.fpts / max) * 100}%` }} /></i>
          <span>{g.pts}</span><span>{g.reb}</span><span>{g.ast}</span>
          <b className="tnum" style={{ width: 48 }}>{fmt1(g.fpts)}</b>
        </div>
      ))}
      {recent.length === 0 ? <div className="ptip" style={{ marginTop: 12 }}>No games played yet.</div> : null}
    </div>
  );
}
