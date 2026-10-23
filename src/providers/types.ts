export type ProviderPlayer = {
  espnId: string;
  name: string;
  teamAbbr: string | null;
  position: string | null;
  jersey: string | null;
  imageUrl: string | null;
  injuryStatus: string | null;
};

export type ProviderGame = {
  espnId: string;
  startTime: Date;
  status: "scheduled" | "live" | "final";
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type ProviderStatLine = {
  gameEspnId: string;
  playerEspnId: string;
  teamAbbr: string;
  name: string;
  imageUrl: string | null;
  position: string | null;
  minutes: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  tpm: number;
  tpa: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  pf: number;
  plusMinus: number;
};

/** All provider calls go through this so the app never depends on one vendor's response shape. */
export interface BasketballDataProvider {
  getTeamIds(): Promise<{ id: string; abbr: string }[]>;
  getRoster(teamId: string): Promise<ProviderPlayer[]>;
  getGames(date: string /* YYYYMMDD */): Promise<ProviderGame[]>;
  getBoxScore(gameEspnId: string): Promise<ProviderStatLine[]>;
}
