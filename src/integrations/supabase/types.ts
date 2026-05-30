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
      blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          created_at: string
          expires_at: string
          blocked_by: string | null
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          created_at?: string
          blocked_by?: string | null
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string
          created_at?: string
          expires_at?: string
          blocked_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          body: string
          kind: string
          contact_payload: Record<string, string | null> | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          body: string
          kind?: string
          contact_payload?: Record<string, string | null> | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          body?: string
          kind?: string
          contact_payload?: Record<string, string | null> | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          created_at: string
          display_name: string | null
          id: string
          instagram_url: string | null
          intent: Database["public"]["Enums"]["wink_intent"] | null
          interests: string[]
          is_live: boolean
          last_seen_at: string | null
          location_lat: number | null
          location_lng: number | null
          onboarding_completed: boolean
          phone: string | null
          tiktok_url: string | null
          updated_at: string
          x_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          instagram_url?: string | null
          intent?: Database["public"]["Enums"]["wink_intent"] | null
          interests?: string[]
          is_live?: boolean
          last_seen_at?: string | null
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          tiktok_url?: string | null
          updated_at?: string
          x_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instagram_url?: string | null
          intent?: Database["public"]["Enums"]["wink_intent"] | null
          interests?: string[]
          is_live?: boolean
          last_seen_at?: string | null
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed?: boolean
          phone?: string | null
          tiktok_url?: string | null
          updated_at?: string
          x_url?: string | null
        }
        Relationships: []
      }
      winks: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          also_blocked: boolean
          created_at: string
          id: string
          reason: string
          reported_person_id: string
          reported_person_name: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          also_blocked?: boolean
          created_at?: string
          id?: string
          reason: string
          reported_person_id: string
          reported_person_name?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          also_blocked?: boolean
          created_at?: string
          id?: string
          reason?: string
          reported_person_id?: string
          reported_person_name?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          user_id: string
          role: "SUPER_ADMIN" | "ADMIN" | "MODERATOR"
          created_at: string
          created_by: string | null
        }
        Insert: {
          user_id: string
          role: "SUPER_ADMIN" | "ADMIN" | "MODERATOR"
          created_at?: string
          created_by?: string | null
        }
        Update: {
          user_id?: string
          role?: "SUPER_ADMIN" | "ADMIN" | "MODERATOR"
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          payload: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          payload?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          payload?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_nearby_profiles: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          id: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          birthdate: string | null
          intent: "dating" | "networking" | "both" | null
          interests: string[]
          distance_m: number
        }[]
      }
      get_my_chats: {
        Args: Record<string, never>
        Returns: {
          id: string
          user1_id: string
          user2_id: string
          created_at: string
          expires_at: string
          other_id: string
          other_name: string | null
          other_avatar: string | null
          last_body: string | null
          last_at: string | null
        }[]
      }
    }
    Enums: {
      report_status: "pending" | "reviewed" | "dismissed"
      wink_intent: "dating" | "networking" | "both"
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
    Enums: {
      report_status: ["pending", "reviewed", "dismissed"],
      wink_intent: ["dating", "networking", "both"],
    },
  },
} as const
