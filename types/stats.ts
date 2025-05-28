// types/stats.ts

export interface PlayerSuggestion {
    personId: number;
    firstName: string | null;
    lastName: string | null;
    startYear: number | null;
    endYear: number | null;
  }
  
  export interface CareerStatsData {
    // Identifying Info (comes from the Supabase function directly)
    personId: number;
    firstName: string | null;
    lastName: string | null;
    startYear: number | null; // First season played
    endYear: number | null;   // Last season played
  
    // Totals
    games_played: number | null;
    mp_total: number | null; // Minutes Played Total
    pts_total: number | null;
    ast_total: number | null;
    blk_total: number | null;
    stl_total: number | null;
    fga_total: number | null; // Field Goals Attempted
    fgm_total: number | null; // Field Goals Made
    fg3a_total: number | null; // 3-Point FG Attempted
    fg3m_total: number | null; // 3-Point FG Made
    fta_total: number | null; // Free Throws Attempted
    ftm_total: number | null; // Free Throws Made
    dreb_total: number | null; // Defensive Rebounds
    oreb_total: number | null; // Offensive Rebounds
    trb_total: number | null; // Total Rebounds
    pf_total: number | null;  // Personal Fouls
    tov_total: number | null; // Turnovers
  
    // Averages & Percentages
    mp_per_g: number | null; // Minutes Per Game
    pts_per_g: number | null;
    ast_per_g: number | null;
    blk_per_g: number | null;
    stl_per_g: number | null;
    trb_per_g: number | null; // Total Rebounds Per Game
    pf_per_g: number | null;
    tov_per_g: number | null;
    fg_pct: number | null;    // Field Goal Percentage
    fg3_pct: number | null;   // 3-Point Percentage
    ft_pct: number | null;    // Free Throw Percentage
    efg_pct: number | null; 
    ts_pct: number | null;
  }

  export interface SelectedPlayerForComparison extends PlayerSuggestion {

  }

  export interface PlayerSeasonDataRow {
    personId: number; // bigint -> number
    firstName: string | null; // text -> string (assuming can be null)
    lastName: string | null; // text -> string (assuming can be null)
    SeasonYear: number | null; // integer -> number (assuming can be null)
    playerteamName: string | null; // text -> string (can be null if between teams or unknown)
    MP_total: number | null; // integer -> number
    PTS_total: number | null; // integer -> number
    AST_total: number | null; // integer -> number
    BLK_total: number | null; // integer -> number
    STL_total: number | null; // integer -> number
    FGA_total: number | null; // integer -> number
    FGM_total: number | null; // integer -> number
    FG3A_total: number | null; // integer -> number
    FG3M_total: number | null; // integer -> number
    FTA_total: number | null; // integer -> number
    FTM_total: number | null; // integer -> number
    DREB_total: number | null; // integer -> number
    OREB_total: number | null; // integer -> number
    TRB_total: number | null; // integer -> number
    PF_total: number | null; // integer -> number
    TOV_total: number | null; // integer -> number
    G: number | null; // integer -> number (Games Played)
    PlayerAge: number; // integer -> number (Assuming PlayerAge is crucial and non-null for a season record)
    FG_PCT: number | null; // double precision -> number
    FG3_PCT: number | null; // double precision -> number
    FT_PCT: number | null; // double precision -> number
    MP_per_g: number | null; // double precision -> number
    PTS_per_g: number | null; // double precision -> number
    AST_per_g: number | null; // double precision -> number
    BLK_per_g: number | null; // double precision -> number
    STL_per_g: number | null; // double precision -> number
    FGA_per_g: number | null; // double precision -> number
    FGM_per_g: number | null; // double precision -> number
    FG3A_per_g: number | null; // double precision -> number
    FG3M_per_g: number | null; // double precision -> number
    FTA_per_g: number | null; // double precision -> number
    FTM_per_g: number | null; // double precision -> number
    DREB_per_g: number | null; // double precision -> number
    OREB_per_g: number | null; // double precision -> number
    TRB_per_g: number | null; // double precision -> number
    PF_per_g: number | null; // double precision -> number
    TOV_per_g: number | null; // double precision -> number
    eFG_PCT: number | null; // double precision -> number
    TS_PCT: number | null; // double precision -> number
    Prominence: number | null; // double precision -> number
  }
  