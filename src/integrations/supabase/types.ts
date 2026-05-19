export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      game_player_stats: {
        Row: {
          apitto_rating: number | null
          assists: number | null
          created_at: string | null
          game_id: string
          goals: number | null
          id: string
          player_name: string | null
          team: string
          user_id: string
        }
        Insert: {
          apitto_rating?: number | null
          assists?: number | null
          created_at?: string | null
          game_id: string
          goals?: number | null
          id?: string
          player_name?: string | null
          team: string
          user_id: string
        }
        Update: {
          apitto_rating?: number | null
          assists?: number | null
          created_at?: string | null
          game_id?: string
          goals?: number | null
          id?: string
          player_name?: string | null
          team?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_votes: {
        Row: {
          apitto_ratings: Json | null
          created_at: string
          game_id: string
          id: string
          mvp_id: string | null
          pereba_id: string | null
          updated_at: string
          voter_id: string
        }
        Insert: {
          apitto_ratings?: Json | null
          created_at?: string
          game_id: string
          id?: string
          mvp_id?: string | null
          pereba_id?: string | null
          updated_at?: string
          voter_id: string
        }
        Update: {
          apitto_ratings?: Json | null
          created_at?: string
          game_id?: string
          id?: string
          mvp_id?: string | null
          pereba_id?: string | null
          updated_at?: string
          voter_id?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string | null
          game_date: string
          id: string
          match_id: string
          mvp_id: string | null
          pereba_id: string | null
          score_a: number | null
          score_b: number | null
          voting_open: boolean | null
        }
        Insert: {
          created_at?: string | null
          game_date?: string
          id?: string
          match_id: string
          mvp_id?: string | null
          pereba_id?: string | null
          score_a?: number | null
          score_b?: number | null
          voting_open?: boolean | null
        }
        Update: {
          created_at?: string | null
          game_date?: string
          id?: string
          match_id?: string
          mvp_id?: string | null
          pereba_id?: string | null
          score_a?: number | null
          score_b?: number | null
          voting_open?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_attendance: {
        Row: {
          created_at: string | null
          has_paid: boolean | null
          id: string
          is_goalkeeper: boolean | null
          match_id: string
          player_id: string | null
          player_name: string
        }
        Insert: {
          created_at?: string | null
          has_paid?: boolean | null
          id?: string
          is_goalkeeper?: boolean | null
          match_id: string
          player_id?: string | null
          player_name: string
        }
        Update: {
          created_at?: string | null
          has_paid?: boolean | null
          id?: string
          is_goalkeeper?: boolean | null
          match_id?: string
          player_id?: string | null
          player_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_attendance_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_invitations: {
        Row: {
          created_at: string | null
          id: string
          invitee_id: string | null
          inviter_id: string | null
          match_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitee_id?: string | null
          inviter_id?: string | null
          match_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invitee_id?: string | null
          inviter_id?: string | null
          match_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_invitations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_members: {
        Row: {
          created_at: string
          is_goalkeeper: boolean
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_goalkeeper?: boolean
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_goalkeeper?: boolean
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_members_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          admin_id: string
          created_at: string
          day_of_week: string | null
          id: string
          is_pro: boolean
          location: string | null
          logo_url: string | null
          match_time: string | null
          match_type: string | null
          name: string
          settings: Json
        }
        Insert: {
          admin_id: string
          created_at?: string
          day_of_week?: string | null
          id?: string
          is_pro?: boolean
          location?: string | null
          logo_url?: string | null
          match_time?: string | null
          match_type?: string | null
          name: string
          settings?: Json
        }
        Update: {
          admin_id?: string
          created_at?: string
          day_of_week?: string | null
          id?: string
          is_pro?: boolean
          location?: string | null
          logo_url?: string | null
          match_time?: string | null
          match_type?: string | null
          name?: string
          settings?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { uname: string }; Returns: string }
      get_match_member_counts: {
        Args: { match_ids: string[] }
        Returns: {
          match_id: string
          total: number
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
