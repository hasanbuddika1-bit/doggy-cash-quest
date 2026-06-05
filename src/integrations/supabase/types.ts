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
      ad_watches: {
        Row: {
          ad_index: number
          created_at: string
          earned: number
          id: string
          network: string
          user_id: string
        }
        Insert: {
          ad_index: number
          created_at?: string
          earned?: number
          id?: string
          network?: string
          user_id: string
        }
        Update: {
          ad_index?: number
          created_at?: string
          earned?: number
          id?: string
          network?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      channel_verifications: {
        Row: {
          channel_id: string
          id: string
          user_id: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          channel_id: string
          id?: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          channel_id?: string
          id?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_verifications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          country_restriction: string | null
          created_at: string
          id: string
          link: string
          name: string
          required: boolean
          sort_order: number
          telegram_username: string
        }
        Insert: {
          country_restriction?: string | null
          created_at?: string
          id?: string
          link: string
          name: string
          required?: boolean
          sort_order?: number
          telegram_username: string
        }
        Update: {
          country_restriction?: string | null
          created_at?: string
          id?: string
          link?: string
          name?: string
          required?: boolean
          sort_order?: number
          telegram_username?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          created_at: string
          earned: number
          id: string
          link_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          earned?: number
          id?: string
          link_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          earned?: number
          id?: string
          link_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_plays: {
        Row: {
          bet: number
          created_at: string
          game: string
          id: string
          meta: Json | null
          payout: number
          user_id: string
          won: boolean
        }
        Insert: {
          bet: number
          created_at?: string
          game: string
          id?: string
          meta?: Json | null
          payout?: number
          user_id: string
          won?: boolean
        }
        Update: {
          bet?: number
          created_at?: string
          game?: string
          id?: string
          meta?: Json | null
          payout?: number
          user_id?: string
          won?: boolean
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          commission_earned: number
          created_at: string
          id: string
          main_reward_paid: boolean
          partner_reward_paid: boolean
          referee_id: string
          referrer_id: string
          reward_amount: number
          reward_claimed: boolean
          status: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          activated_at?: string | null
          commission_earned?: number
          created_at?: string
          id?: string
          main_reward_paid?: boolean
          partner_reward_paid?: boolean
          referee_id: string
          referrer_id: string
          reward_amount?: number
          reward_claimed?: boolean
          status?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          activated_at?: string | null
          commission_earned?: number
          created_at?: string
          id?: string
          main_reward_paid?: boolean
          partner_reward_paid?: boolean
          referee_id?: string
          referrer_id?: string
          reward_amount?: number
          reward_claimed?: boolean
          status?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_claims: {
        Row: {
          amount: number
          code_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          code_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          code_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "reward_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          current_uses: number
          id: string
          max_uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          current_uses?: number
          id?: string
          max_uses?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          current_uses?: number
          id?: string
          max_uses?: number
          value?: number
        }
        Relationships: []
      }
      reward_history: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          meta: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      short_link_claims: {
        Row: {
          amount: number
          claimed_at: string | null
          id: string
          next_available_at: string | null
          reward_token: string
          short_link_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string | null
          id?: string
          next_available_at?: string | null
          reward_token: string
          short_link_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          id?: string
          next_available_at?: string | null
          reward_token?: string
          short_link_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_link_claims_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_link_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          active: boolean
          created_at: string
          daily_cooldown_hours: number
          id: string
          max_claims_per_user: number
          reward_amount: number
          reward_token: string
          short_url: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_cooldown_hours?: number
          id?: string
          max_claims_per_user?: number
          reward_amount?: number
          reward_token?: string
          short_url: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_cooldown_hours?: number
          id?: string
          max_claims_per_user?: number
          reward_amount?: number
          reward_token?: string
          short_url?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          verified_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          image_url: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          gives_reward: boolean
          id: string
          link: string | null
          requires_image: boolean
          sort_order: number
          task_type: string
          telegram_bot_username: string | null
          telegram_channel: string | null
          title: string
          updated_at: string
          value: number
          verify_method: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          gives_reward?: boolean
          id?: string
          link?: string | null
          requires_image?: boolean
          sort_order?: number
          task_type?: string
          telegram_bot_username?: string | null
          telegram_channel?: string | null
          title: string
          updated_at?: string
          value?: number
          verify_method?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          gives_reward?: boolean
          id?: string
          link?: string | null
          requires_image?: boolean
          sort_order?: number
          task_type?: string
          telegram_bot_username?: string | null
          telegram_channel?: string | null
          title?: string
          updated_at?: string
          value?: number
          verify_method?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          access_tasks_completed: boolean
          aptos_address: string | null
          balance: number
          banned: boolean
          country: string | null
          created_at: string
          first_name: string | null
          id: string
          ip_address: string | null
          notifications_enabled: boolean
          photo_url: string | null
          referrer_id: string | null
          suspended_at: string | null
          suspension_reason: string | null
          telegram_id: number
          ton_address: string | null
          updated_at: string
          username: string | null
          wallet_address: string | null
          welcome_bonus_claimed: boolean
          withdraw_unlocked: boolean
        }
        Insert: {
          access_tasks_completed?: boolean
          aptos_address?: string | null
          balance?: number
          banned?: boolean
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          ip_address?: string | null
          notifications_enabled?: boolean
          photo_url?: string | null
          referrer_id?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          telegram_id: number
          ton_address?: string | null
          updated_at?: string
          username?: string | null
          wallet_address?: string | null
          welcome_bonus_claimed?: boolean
          withdraw_unlocked?: boolean
        }
        Update: {
          access_tasks_completed?: boolean
          aptos_address?: string | null
          balance?: number
          banned?: boolean
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          ip_address?: string | null
          notifications_enabled?: boolean
          photo_url?: string | null
          referrer_id?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          telegram_id?: number
          ton_address?: string | null
          updated_at?: string
          username?: string | null
          wallet_address?: string | null
          welcome_bonus_claimed?: boolean
          withdraw_unlocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "users_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenge_claims: {
        Row: {
          amount: number
          challenge_key: string
          created_at: string
          id: string
          user_id: string
          week_start: string
        }
        Insert: {
          amount?: number
          challenge_key: string
          created_at?: string
          id?: string
          user_id: string
          week_start: string
        }
        Update: {
          amount?: number
          challenge_key?: string
          created_at?: string
          id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          fee_usdt: number
          id: string
          method: string
          net_usdt: number
          status: Database["public"]["Enums"]["withdraw_status"]
          ton_amount: number | null
          tx_hash: string | null
          updated_at: string
          usdt_amount: number
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          fee_usdt?: number
          id?: string
          method?: string
          net_usdt?: number
          status?: Database["public"]["Enums"]["withdraw_status"]
          ton_amount?: number | null
          tx_hash?: string | null
          updated_at?: string
          usdt_amount: number
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          fee_usdt?: number
          id?: string
          method?: string
          net_usdt?: number
          status?: Database["public"]["Enums"]["withdraw_status"]
          ton_amount?: number | null
          tx_hash?: string | null
          updated_at?: string
          usdt_amount?: number
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      task_status: "pending" | "approved" | "rejected"
      withdraw_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      task_status: ["pending", "approved", "rejected"],
      withdraw_status: ["pending", "approved", "rejected"],
    },
  },
} as const
