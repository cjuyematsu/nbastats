export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      currentweeklyrankings: {
        Row: {
          player_id: number
          rank_position: number
          ranked_at: string | null
          stats_based_prominence: number | null
          week_of_year: number
          weekly_movement_score: number | null
          weekly_same_spot_votes: number | null
          year: number
        }
        Insert: {
          player_id: number
          rank_position: number
          ranked_at?: string | null
          stats_based_prominence?: number | null
          week_of_year: number
          weekly_movement_score?: number | null
          weekly_same_spot_votes?: number | null
          year: number
        }
        Update: {
          player_id?: number
          rank_position?: number
          ranked_at?: string | null
          stats_based_prominence?: number | null
          week_of_year?: number
          weekly_movement_score?: number | null
          weekly_same_spot_votes?: number | null
          year?: number
        }
        Relationships: []
      }
      gamescores: {
        Row: {
          attempts: number | null
          game_data: Json | null
          game_type: string
          id: number
          played_at: string
          score: number
          user_id: string
        }
        Insert: {
          attempts?: number | null
          game_data?: Json | null
          game_type: string
          id?: number
          played_at?: string
          score: number
          user_id: string
        }
        Update: {
          attempts?: number | null
          game_data?: Json | null
          game_type?: string
          id?: number
          played_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      playervotes: {
        Row: {
          created_at: string | null
          player_id: number
          updated_at: string | null
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string | null
          player_id: number
          updated_at?: string | null
          user_id?: string
          vote_type: number
        }
        Update: {
          created_at?: string | null
          player_id?: number
          updated_at?: string | null
          user_id?: string
          vote_type?: number
        }
        Relationships: []
      }
      playoffstats: {
        Row: {
          AST_per_g: number | null
          AST_total: number | null
          BLK_per_g: number | null
          BLK_total: number | null
          DREB_per_g: number | null
          DREB_total: number | null
          eFG_PCT: number | null
          FG_PCT: number | null
          FG3_PCT: number | null
          FG3A_per_g: number | null
          FG3A_total: number | null
          FG3M_per_g: number | null
          FG3M_total: number | null
          FGA_per_g: number | null
          FGA_total: number | null
          FGM_per_g: number | null
          FGM_total: number | null
          firstName: string | null
          FT_PCT: number | null
          FTA_per_g: number | null
          FTA_total: number | null
          FTM_per_g: number | null
          FTM_total: number | null
          G: number | null
          lastName: string | null
          MP_per_g: number | null
          MP_total: number | null
          OREB_per_g: number | null
          OREB_total: number | null
          personId: number
          PF_per_g: number | null
          PF_total: number | null
          PlayerAge: number | null
          playerteamName: string
          Prominence: number | null
          PTS_per_g: number | null
          PTS_total: number | null
          SeasonYear: number
          STL_per_g: number | null
          STL_total: number | null
          TOV_per_g: number | null
          TOV_total: number | null
          TRB_per_g: number | null
          TRB_total: number | null
          TS_PCT: number | null
          WINS: number | null
        }
        Insert: {
          AST_per_g?: number | null
          AST_total?: number | null
          BLK_per_g?: number | null
          BLK_total?: number | null
          DREB_per_g?: number | null
          DREB_total?: number | null
          eFG_PCT?: number | null
          FG_PCT?: number | null
          FG3_PCT?: number | null
          FG3A_per_g?: number | null
          FG3A_total?: number | null
          FG3M_per_g?: number | null
          FG3M_total?: number | null
          FGA_per_g?: number | null
          FGA_total?: number | null
          FGM_per_g?: number | null
          FGM_total?: number | null
          firstName?: string | null
          FT_PCT?: number | null
          FTA_per_g?: number | null
          FTA_total?: number | null
          FTM_per_g?: number | null
          FTM_total?: number | null
          G?: number | null
          lastName?: string | null
          MP_per_g?: number | null
          MP_total?: number | null
          OREB_per_g?: number | null
          OREB_total?: number | null
          personId: number
          PF_per_g?: number | null
          PF_total?: number | null
          PlayerAge?: number | null
          playerteamName: string
          Prominence?: number | null
          PTS_per_g?: number | null
          PTS_total?: number | null
          SeasonYear: number
          STL_per_g?: number | null
          STL_total?: number | null
          TOV_per_g?: number | null
          TOV_total?: number | null
          TRB_per_g?: number | null
          TRB_total?: number | null
          TS_PCT?: number | null
          WINS?: number | null
        }
        Update: {
          AST_per_g?: number | null
          AST_total?: number | null
          BLK_per_g?: number | null
          BLK_total?: number | null
          DREB_per_g?: number | null
          DREB_total?: number | null
          eFG_PCT?: number | null
          FG_PCT?: number | null
          FG3_PCT?: number | null
          FG3A_per_g?: number | null
          FG3A_total?: number | null
          FG3M_per_g?: number | null
          FG3M_total?: number | null
          FGA_per_g?: number | null
          FGA_total?: number | null
          FGM_per_g?: number | null
          FGM_total?: number | null
          firstName?: string | null
          FT_PCT?: number | null
          FTA_per_g?: number | null
          FTA_total?: number | null
          FTM_per_g?: number | null
          FTM_total?: number | null
          G?: number | null
          lastName?: string | null
          MP_per_g?: number | null
          MP_total?: number | null
          OREB_per_g?: number | null
          OREB_total?: number | null
          personId?: number
          PF_per_g?: number | null
          PF_total?: number | null
          PlayerAge?: number | null
          playerteamName?: string
          Prominence?: number | null
          PTS_per_g?: number | null
          PTS_total?: number | null
          SeasonYear?: number
          STL_per_g?: number | null
          STL_total?: number | null
          TOV_per_g?: number | null
          TOV_total?: number | null
          TRB_per_g?: number | null
          TRB_total?: number | null
          TS_PCT?: number | null
          WINS?: number | null
        }
        Relationships: []
      }
      rankinghistory: {
        Row: {
          archived_at: string | null
          history_id: number
          player_id: number
          rank_position: number
          stats_based_prominence: number | null
          week_of_year: number
          weekly_movement_score: number | null
          weekly_same_spot_votes: number | null
          year: number
        }
        Insert: {
          archived_at?: string | null
          history_id?: number
          player_id: number
          rank_position: number
          stats_based_prominence?: number | null
          week_of_year: number
          weekly_movement_score?: number | null
          weekly_same_spot_votes?: number | null
          year: number
        }
        Update: {
          archived_at?: string | null
          history_id?: number
          player_id?: number
          rank_position?: number
          stats_based_prominence?: number | null
          week_of_year?: number
          weekly_movement_score?: number | null
          weekly_same_spot_votes?: number | null
          year?: number
        }
        Relationships: []
      }
      regularseasonstats: {
        Row: {
          AST_per_g: number | null
          AST_total: number | null
          BLK_per_g: number | null
          BLK_total: number | null
          DREB_per_g: number | null
          DREB_total: number | null
          eFG_PCT: number | null
          FG_PCT: number | null
          FG3_PCT: number | null
          FG3A_per_g: number | null
          FG3A_total: number | null
          FG3M_per_g: number | null
          FG3M_total: number | null
          FGA_per_g: number | null
          FGA_total: number | null
          FGM_per_g: number | null
          FGM_total: number | null
          firstName: string | null
          FT_PCT: number | null
          FTA_per_g: number | null
          FTA_total: number | null
          FTM_per_g: number | null
          FTM_total: number | null
          G: number | null
          lastName: string | null
          MP_per_g: number | null
          MP_total: number | null
          OREB_per_g: number | null
          OREB_total: number | null
          personId: number
          PF_per_g: number | null
          PF_total: number | null
          PlayerAge: number | null
          playerteamName: string
          Prominence: number | null
          PTS_per_g: number | null
          PTS_total: number | null
          SeasonYear: number
          STL_per_g: number | null
          STL_total: number | null
          TOV_per_g: number | null
          TOV_total: number | null
          TRB_per_g: number | null
          TRB_total: number | null
          TS_PCT: number | null
          WINS: number | null
        }
        Insert: {
          AST_per_g?: number | null
          AST_total?: number | null
          BLK_per_g?: number | null
          BLK_total?: number | null
          DREB_per_g?: number | null
          DREB_total?: number | null
          eFG_PCT?: number | null
          FG_PCT?: number | null
          FG3_PCT?: number | null
          FG3A_per_g?: number | null
          FG3A_total?: number | null
          FG3M_per_g?: number | null
          FG3M_total?: number | null
          FGA_per_g?: number | null
          FGA_total?: number | null
          FGM_per_g?: number | null
          FGM_total?: number | null
          firstName?: string | null
          FT_PCT?: number | null
          FTA_per_g?: number | null
          FTA_total?: number | null
          FTM_per_g?: number | null
          FTM_total?: number | null
          G?: number | null
          lastName?: string | null
          MP_per_g?: number | null
          MP_total?: number | null
          OREB_per_g?: number | null
          OREB_total?: number | null
          personId: number
          PF_per_g?: number | null
          PF_total?: number | null
          PlayerAge?: number | null
          playerteamName: string
          Prominence?: number | null
          PTS_per_g?: number | null
          PTS_total?: number | null
          SeasonYear: number
          STL_per_g?: number | null
          STL_total?: number | null
          TOV_per_g?: number | null
          TOV_total?: number | null
          TRB_per_g?: number | null
          TRB_total?: number | null
          TS_PCT?: number | null
          WINS?: number | null
        }
        Update: {
          AST_per_g?: number | null
          AST_total?: number | null
          BLK_per_g?: number | null
          BLK_total?: number | null
          DREB_per_g?: number | null
          DREB_total?: number | null
          eFG_PCT?: number | null
          FG_PCT?: number | null
          FG3_PCT?: number | null
          FG3A_per_g?: number | null
          FG3A_total?: number | null
          FG3M_per_g?: number | null
          FG3M_total?: number | null
          FGA_per_g?: number | null
          FGA_total?: number | null
          FGM_per_g?: number | null
          FGM_total?: number | null
          firstName?: string | null
          FT_PCT?: number | null
          FTA_per_g?: number | null
          FTA_total?: number | null
          FTM_per_g?: number | null
          FTM_total?: number | null
          G?: number | null
          lastName?: string | null
          MP_per_g?: number | null
          MP_total?: number | null
          OREB_per_g?: number | null
          OREB_total?: number | null
          personId?: number
          PF_per_g?: number | null
          PF_total?: number | null
          PlayerAge?: number | null
          playerteamName?: string
          Prominence?: number | null
          PTS_per_g?: number | null
          PTS_total?: number | null
          SeasonYear?: number
          STL_per_g?: number | null
          STL_total?: number | null
          TOV_per_g?: number | null
          TOV_total?: number | null
          TRB_per_g?: number | null
          TRB_total?: number | null
          TS_PCT?: number | null
          WINS?: number | null
        }
        Relationships: []
      }
      teammates: {
        Row: {
          EndYearTogether: number | null
          PlayerID: number
          PlayerName: string | null
          SharedGamesRecord: string | null
          SharedGamesTotal: number | null
          SharedTeams: string | null
          StartYearTogether: number | null
          TeammateID: number
          TeammateName: string
        }
        Insert: {
          EndYearTogether?: number | null
          PlayerID: number
          PlayerName?: string | null
          SharedGamesRecord?: string | null
          SharedGamesTotal?: number | null
          SharedTeams?: string | null
          StartYearTogether?: number | null
          TeammateID: number
          TeammateName: string
        }
        Update: {
          EndYearTogether?: number | null
          PlayerID?: number
          PlayerName?: string | null
          SharedGamesRecord?: string | null
          SharedGamesTotal?: number | null
          SharedTeams?: string | null
          StartYearTogether?: number | null
          TeammateID?: number
          TeammateName?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_player_career_playoff_stats: {
        Args: { p_person_id: number }
        Returns: {
          personId: number
          firstName: string
          lastName: string
          startYear: number
          endYear: number
          games_played: number
          mp_total: number
          pts_total: number
          ast_total: number
          blk_total: number
          stl_total: number
          fga_total: number
          fgm_total: number
          fg3a_total: number
          fg3m_total: number
          fta_total: number
          ftm_total: number
          dreb_total: number
          oreb_total: number
          trb_total: number
          pf_total: number
          tov_total: number
          mp_per_g: number
          pts_per_g: number
          ast_per_g: number
          blk_per_g: number
          stl_per_g: number
          trb_per_g: number
          pf_per_g: number
          tov_per_g: number
          fg_pct: number
          fg3_pct: number
          ft_pct: number
          efg_pct: number
          ts_pct: number
        }[]
      }
      calculate_player_career_stats: {
        Args: { p_person_id: number }
        Returns: {
          personId: number
          firstName: string
          lastName: string
          startYear: number
          endYear: number
          games_played: number
          mp_total: number
          pts_total: number
          ast_total: number
          blk_total: number
          stl_total: number
          fga_total: number
          fgm_total: number
          fg3a_total: number
          fg3m_total: number
          fta_total: number
          ftm_total: number
          dreb_total: number
          oreb_total: number
          trb_total: number
          pf_total: number
          tov_total: number
          mp_per_g: number
          pts_per_g: number
          ast_per_g: number
          blk_per_g: number
          stl_per_g: number
          trb_per_g: number
          pf_per_g: number
          tov_per_g: number
          fg_pct: number
          fg3_pct: number
          ft_pct: number
          efg_pct: number
          ts_pct: number
        }[]
      }
      get_current_ranking_with_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          rankNumber: number
          personId: number
          weeklyMovementScore: number
          statsBasedProminence: number
          firstName: string
          lastName: string
          playerteamName: string
          G: number
          PTS_total: number
          TRB_total: number
          AST_total: number
          STL_total: number
          BLK_total: number
          FGA_total: number
          FGM_total: number
          FG3A_total: number
          FG3M_total: number
          FTA_total: number
          FTM_total: number
          Prominence_rs: number
        }[]
      }
      get_next_rearrangement_time: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_rearrangement_time_calculated: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_player_suggestions: {
        Args: { search_term: string }
        Returns: {
          personId: number
          firstName: string
          lastName: string
          startYear: number
          endYear: number
        }[]
      }
      get_player_suggestions_2025: {
        Args: { search_term: string }
        Returns: {
          personId: number
          firstName: string
          lastName: string
          min_season: number
          max_season: number
        }[]
      }
      get_top_100_players_vote_refined: {
        Args: Record<PropertyKey, never>
        Returns: {
          rankNumber: number
          personId: number
          firstName: string
          lastName: string
          playerteamName: string
          gamesPlayed: number
          pointsPerGame: number
          reboundsPerGame: number
          assistsPerGame: number
          stealsPerGame: number
          blocksPerGame: number
          fieldGoalPercentage: number
          threePointPercentage: number
          freeThrowPercentage: number
          weightedProminence: number
          upvotes: number
          downvotes: number
          sameSpotVotes: number
          finalMovementScore: number
        }[]
      }
      get_top_100_prominence_2025_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          rankNumber: number
          personId: number
          firstName: string
          lastName: string
          playerteamName: string
          gamesPlayed: number
          pointsPerGame: number
          reboundsPerGame: number
          assistsPerGame: number
          stealsPerGame: number
          blocksPerGame: number
          fieldGoalPercentage: number
          threePointPercentage: number
          freeThrowPercentage: number
          weightedProminence: number
        }[]
      }
      safe_to_integer: {
        Args: { val: string; default_val?: number }
        Returns: number
      }
      submit_player_vote: {
        Args: { target_player_id: number; new_vote_type: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
