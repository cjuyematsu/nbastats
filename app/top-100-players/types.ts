//app/top-100-players/types.ts

export interface RpcRankedPlayerData { 
    rankNumber: number; 
    personId: number; 
    weeklyMovementScore: number | null;
    statsBasedProminence: number | null;
    firstName: string | null;
    lastName: string | null;
    playerteamName: string | null;
    G: number | null; 
    PTS_total: number | null;
    TRB_total: number | null;
    AST_total: number | null;
    STL_total: number | null;
    BLK_total: number | null;
    FGA_total: number | null;
    FGM_total: number | null;
    FG3A_total: number | null;
    FG3M_total: number | null;
    FTA_total: number | null;
    FTM_total: number | null;
    Prominence_rs: number | null; 
  }
  
  export interface TopPlayer {
    rankNumber: number; 
    personId: number; 
    firstName: string;
    lastName: string;
    playerteamName: string;
    gamesPlayed: number | null;
    pointsPerGame: number | null;
    reboundsPerGame: number | null;
    assistsPerGame: number | null;
    stealsPerGame: number | null;
    blocksPerGame: number | null;
    fieldGoalPercentage: number | null;
    threePointPercentage: number | null;
    freeThrowPercentage: number | null;
    trueShootingPercentage: number | null; 
    weightedProminence: number | null; 
    upvotes: number;            
    downvotes: number;          
    sameSpotVotes: number;      
    finalMovementScoreAtRanking: number; 
    currentUserVote?: number | null;
  }