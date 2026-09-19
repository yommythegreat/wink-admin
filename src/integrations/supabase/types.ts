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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          payload: Json | null
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          blocked_by: string | null
          created_at: string
          expires_at: string
          id: string
          notified_user1_at: string | null
          notified_user2_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          notified_user1_at?: string | null
          notified_user2_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          notified_user1_at?: string | null
          notified_user2_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          radius_m: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          radius_m?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          radius_m?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      city_categories: {
        Row: {
          category_id: string
          city_id: string
          created_at: string
        }
        Insert: {
          category_id: string
          city_id: string
          created_at?: string
        }
        Update: {
          category_id?: string
          city_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spot_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_categories_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      city_launch_interest: {
        Row: {
          created_at: string
          id: string
          lat: number
          lng: number
          notified_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat: number
          lng: number
          notified_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          notified_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_launch_interest_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_emails: {
        Row: {
          deleted_at: string
          email: string
        }
        Insert: {
          deleted_at?: string
          email: string
        }
        Update: {
          deleted_at?: string
          email?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          chat_id: string
          contact_payload: Json | null
          created_at: string
          id: string
          kind: string
          sender_id: string
        }
        Insert: {
          body: string
          chat_id: string
          contact_payload?: Json | null
          created_at?: string
          id?: string
          kind?: string
          sender_id: string
        }
        Update: {
          body?: string
          chat_id?: string
          contact_payload?: Json | null
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          created_at: string
          current_city_id: string | null
          daily_live_count: number
          display_name: string | null
          gender: string | null
          has_completed_tour: boolean
          has_seen_spots_intro: boolean
          id: string
          instagram_url: string | null
          interests: string[]
          is_banned: boolean
          is_live: boolean
          is_paid: boolean
          last_live_date: string | null
          last_seen_at: string | null
          live_match_count: number
          location_lat: number | null
          location_lng: number | null
          match_count: number
          onboarding_completed: boolean
          phone: string | null
          plan_tier: string
          referral_code: string
          referred_by: string | null
          spot_match_count: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_start: string | null
          subscription_period_end: string | null
          subscription_status: string | null
          tiktok_url: string | null
          total_live_count: number
          updated_at: string
          wink_credit_balance: number
          x_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string
          current_city_id?: string | null
          daily_live_count?: number
          display_name?: string | null
          gender?: string | null
          has_completed_tour?: boolean
          has_seen_spots_intro?: boolean
          id: string
          instagram_url?: string | null
          interests?: string[]
          is_banned?: boolean
          is_live?: boolean
          is_paid?: boolean
          last_live_date?: string | null
          last_seen_at?: string | null
          live_match_count?: number
          location_lat?: number | null
          location_lng?: number | null
          match_count?: number
          onboarding_completed?: boolean
          phone?: string | null
          plan_tier?: string
          referral_code: string
          referred_by?: string | null
          spot_match_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_start?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          tiktok_url?: string | null
          total_live_count?: number
          updated_at?: string
          wink_credit_balance?: number
          x_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string
          current_city_id?: string | null
          daily_live_count?: number
          display_name?: string | null
          gender?: string | null
          has_completed_tour?: boolean
          has_seen_spots_intro?: boolean
          id?: string
          instagram_url?: string | null
          interests?: string[]
          is_banned?: boolean
          is_live?: boolean
          is_paid?: boolean
          last_live_date?: string | null
          last_seen_at?: string | null
          live_match_count?: number
          location_lat?: number | null
          location_lng?: number | null
          match_count?: number
          onboarding_completed?: boolean
          phone?: string | null
          plan_tier?: string
          referral_code?: string
          referred_by?: string | null
          spot_match_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_start?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          tiktok_url?: string | null
          total_live_count?: number
          updated_at?: string
          wink_credit_balance?: number
          x_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_city_id_fkey"
            columns: ["current_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_redemptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_redemptions_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_redemptions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          also_blocked: boolean
          category: string | null
          created_at: string
          id: string
          reason: string | null
          reported_person_id: string
          reported_person_name: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          also_blocked?: boolean
          category?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_person_id: string
          reported_person_name?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          also_blocked?: boolean
          category?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_person_id?: string
          reported_person_name?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: []
      }
      spot_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      spot_memberships: {
        Row: {
          available_to_connect: boolean
          id: string
          is_active: boolean | null
          joined_at: string
          left_at: string | null
          spot_id: string
          user_id: string
        }
        Insert: {
          available_to_connect?: boolean
          id?: string
          is_active?: boolean | null
          joined_at?: string
          left_at?: string | null
          spot_id: string
          user_id: string
        }
        Update: {
          available_to_connect?: boolean
          id?: string
          is_active?: boolean | null
          joined_at?: string
          left_at?: string | null
          spot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_memberships_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_suggestions: {
        Row: {
          address: string | null
          category_id: string | null
          category_text: string | null
          city_id: string | null
          city_text: string | null
          converted_spot_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          category_text?: string | null
          city_id?: string | null
          city_text?: string | null
          converted_spot_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          category_text?: string | null
          city_id?: string | null
          city_text?: string | null
          converted_spot_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_suggestions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spot_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_suggestions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_suggestions_converted_spot_id_fkey"
            columns: ["converted_spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_suggestions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          address: string | null
          archived_at: string | null
          category_id: string
          city_id: string
          converted_from_suggestion_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          gallery_image_urls: string[]
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          category_id: string
          city_id: string
          converted_from_suggestion_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gallery_image_urls?: string[]
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          category_id?: string
          city_id?: string
          converted_from_suggestion_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gallery_image_urls?: string[]
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spot_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spots_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spots_converted_from_suggestion_id_fkey"
            columns: ["converted_from_suggestion_id"]
            isOneToOne: false
            referencedRelation: "spot_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      winks: {
        Row: {
          context: string
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          spot_id: string | null
        }
        Insert: {
          context?: string
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          spot_id?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          spot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "winks_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_user_active_memberships: {
        Row: {
          available_to_connect: boolean | null
          category_id: string | null
          city_id: string | null
          joined_at: string | null
          spot_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_memberships_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spot_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spots_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      award_referral_credit: {
        Args: { p_referred: string; p_referrer: string }
        Returns: number
      }
      config_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      current_cycle_start: { Args: { p_anchor: string }; Returns: string }
      delete_current_user: { Args: never; Returns: undefined }
      extend_chat: { Args: { p_chat_id: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_mutual_spots: {
        Args: { in_other_user_id: string }
        Returns: {
          city_id: string
          city_name: string
          cover_image_url: string
          id: string
          name: string
        }[]
      }
      get_my_chats: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          last_at: string
          last_body: string
          notified_at: string
          other_avatar: string
          other_id: string
          other_name: string
          user1_id: string
          user2_id: string
        }[]
      }
      get_my_referrals: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          referred_email: string
          referred_name: string
        }[]
      }
      get_my_winks: {
        Args: never
        Returns: {
          context: string
          created_at: string
          id: string
          other_avatar_url: string
          other_birthdate: string
          other_display_name: string
          other_id: string
          receiver_id: string
          sender_id: string
          spot_id: string
        }[]
      }
      get_nearby_profiles: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          active_chat_id: string
          avatar_url: string
          bio: string
          birthdate: string
          display_name: string
          distance_m: number
          gender: string
          id: string
          interests: string[]
        }[]
      }
      get_spot_members: {
        Args: { in_spot_id: string }
        Returns: {
          available_to_connect: boolean
          avatar_url: string
          bio: string
          birthdate: string
          display_name: string
          gender: string
          joined_at: string
          mutual_spot_count: number
          user_id: string
        }[]
      }
      get_spots_in_my_city: {
        Args: never
        Returns: {
          address: string
          am_member: boolean
          category_icon: string
          category_id: string
          category_name: string
          category_slug: string
          category_sort_order: number
          city_id: string
          cover_image_url: string
          description: string
          id: string
          member_count: number
          name: string
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_email_deleted: { Args: { p_email: string }; Returns: boolean }
      log_user_action: {
        Args: {
          in_action: string
          in_payload?: Json
          in_target_id: string
          in_target_type: string
        }
        Returns: string
      }
      notify_city_launch: { Args: { in_city_id: string }; Returns: number }
      notify_push: {
        Args: {
          body: string
          data?: Json
          target_user_id: string
          title: string
        }
        Returns: undefined
      }
      resolve_city_by_names: {
        Args: { in_candidates: string[] }
        Returns: string
      }
      resolve_city_for: {
        Args: { in_lat: number; in_lng: number }
        Returns: string
      }
      update_my_location_and_city:
        | { Args: { in_lat: number; in_lng: number }; Returns: string }
        | {
            Args: { in_candidates: string[]; in_lat: number; in_lng: number }
            Returns: string
          }
    }
    Enums: {
      report_status: "pending" | "reviewed" | "dismissed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
