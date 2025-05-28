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
        }
        Relationships: []
      }
      teammates: {
        Row: {
          PlayerID: number
          PlayerName: string | null
          TeammateID: number
          TeammateName: string | null
        }
        Insert: {
          PlayerID: number
          PlayerName?: string | null
          TeammateID: number
          TeammateName?: string | null
        }
        Update: {
          PlayerID?: number
          PlayerName?: string | null
          TeammateID?: number
          TeammateName?: string | null
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
      safe_to_integer: {
        Args: { val: string; default_val?: number }
        Returns: number
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
