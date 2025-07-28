export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      edge_function_logs: {
        Row: {
          created_at: string
          deployment_id: string
          error_details: Json | null
          event_message: string | null
          execution_time_ms: number
          function_id: string
          id: string
          method: string
          status_code: number
          timestamp: string
          version: string
        }
        Insert: {
          created_at?: string
          deployment_id: string
          error_details?: Json | null
          event_message?: string | null
          execution_time_ms: number
          function_id: string
          id?: string
          method: string
          status_code: number
          timestamp: string
          version: string
        }
        Update: {
          created_at?: string
          deployment_id?: string
          error_details?: Json | null
          event_message?: string | null
          execution_time_ms?: number
          function_id?: string
          id?: string
          method?: string
          status_code?: number
          timestamp?: string
          version?: string
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          created_at: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          storage_path: string
          upload_status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          storage_path: string
          upload_status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          storage_path?: string
          upload_status?: string
          user_id?: string
        }
        Relationships: []
      }
      function_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          function_name: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          function_name: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          function_name?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      job_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          job_id: string
          message: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          job_id: string
          message: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          job_id?: string
          message?: string
        }
        Relationships: []
      }
      job_processing_logs: {
        Row: {
          created_at: string | null
          data_quality_score: number | null
          error_message: string | null
          id: string
          job_id: string
          linkedin_url: string
          metadata: Json | null
          processing_stage: string
          processing_time_ms: number | null
          proxy_used: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_quality_score?: number | null
          error_message?: string | null
          id?: string
          job_id: string
          linkedin_url: string
          metadata?: Json | null
          processing_stage: string
          processing_time_ms?: number | null
          proxy_used?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_quality_score?: number | null
          error_message?: string | null
          id?: string
          job_id?: string
          linkedin_url?: string
          metadata?: Json | null
          processing_stage?: string
          processing_time_ms?: number | null
          proxy_used?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_processing_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_enhancement_enabled: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          error_message: string | null
          id: string
          input_file_id: string | null
          max_retries: number | null
          name: string
          output_file_id: string | null
          processed_urls: number
          processing_strategy: Json | null
          progress: number
          proxy_usage_stats: Json | null
          quality_metrics: Json | null
          retry_count: number | null
          settings: Json | null
          started_at: string | null
          status: string
          total_urls: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_enhancement_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          input_file_id?: string | null
          max_retries?: number | null
          name: string
          output_file_id?: string | null
          processed_urls?: number
          processing_strategy?: Json | null
          progress?: number
          proxy_usage_stats?: Json | null
          quality_metrics?: Json | null
          retry_count?: number | null
          settings?: Json | null
          started_at?: string | null
          status?: string
          total_urls?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_enhancement_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          input_file_id?: string | null
          max_retries?: number | null
          name?: string
          output_file_id?: string | null
          processed_urls?: number
          processing_strategy?: Json | null
          progress?: number
          proxy_usage_stats?: Json | null
          quality_metrics?: Json | null
          retry_count?: number | null
          settings?: Json | null
          started_at?: string | null
          status?: string
          total_urls?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      proxy_configs: {
        Row: {
          avg_response_time: number | null
          created_at: string | null
          failed_requests: number | null
          health_check_status: string | null
          host: string
          id: string
          is_active: boolean | null
          last_error_message: string | null
          last_used_at: string | null
          name: string
          password: string | null
          port: number
          success_rate: number | null
          successful_requests: number | null
          total_requests: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          avg_response_time?: number | null
          created_at?: string | null
          failed_requests?: number | null
          health_check_status?: string | null
          host: string
          id?: string
          is_active?: boolean | null
          last_error_message?: string | null
          last_used_at?: string | null
          name: string
          password?: string | null
          port: number
          success_rate?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          avg_response_time?: number | null
          created_at?: string | null
          failed_requests?: number | null
          health_check_status?: string | null
          host?: string
          id?: string
          is_active?: boolean | null
          last_error_message?: string | null
          last_used_at?: string | null
          name?: string
          password?: string | null
          port?: number
          success_rate?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      scraped_profiles: {
        Row: {
          ai_enhanced_data: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          job_id: string
          linkedin_url: string
          processing_metadata: Json | null
          profile_data: Json | null
          quality_score: number | null
          scraped_at: string | null
          status: string
        }
        Insert: {
          ai_enhanced_data?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          linkedin_url: string
          processing_metadata?: Json | null
          profile_data?: Json | null
          quality_score?: number | null
          scraped_at?: string | null
          status?: string
        }
        Update: {
          ai_enhanced_data?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          linkedin_url?: string
          processing_metadata?: Json | null
          profile_data?: Json | null
          quality_score?: number | null
          scraped_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_profiles_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          createdAt: string
          email: string
          id: string
        }
        Insert: {
          createdAt?: string
          email: string
          id: string
        }
        Update: {
          createdAt?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      edge_function_analytics: {
        Row: {
          avg_execution_time_ms: number | null
          error_calls: number | null
          error_rate_percent: number | null
          function_id: string | null
          max_execution_time_ms: number | null
          min_execution_time_ms: number | null
          p95_execution_time_ms: number | null
          slow_calls: number | null
          success_rate_percent: number | null
          successful_calls: number | null
          total_calls: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_user: {
        Args: { email: string; password: string }
        Returns: Json
      }
      calculate_job_quality_metrics: {
        Args: { job_id_param: string }
        Returns: Json
      }
      cancel_job: {
        Args: { job_id: string }
        Returns: Json
      }
      check_dead_tuples: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          row_count: number
          dead_tuples: number
          dead_tuple_percentage: number
        }[]
      }
      create_job: {
        Args: {
          title: string
          description: string
          tenant_id: string
          file_ids?: string[]
        }
        Returns: Json
      }
      create_scraped_profile: {
        Args: {
          job_id: string
          linkedin_url: string
          status?: string
          profile_data?: Json
          error_message?: string
        }
        Returns: Json
      }
      get_file_download_url: {
        Args: { file_id: string }
        Returns: Json
      }
      get_job: {
        Args: { job_id: string }
        Returns: Json
      }
      get_job_with_profiles: {
        Args: { job_id: string; user_id?: string }
        Returns: Json
      }
      get_jobs: {
        Args: { status?: string; page?: number; page_size?: number }
        Returns: Json
      }
      get_proxy_configs: {
        Args: { is_active?: boolean }
        Returns: Json
      }
      get_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_tenants: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      log_edge_function_event: {
        Args: {
          p_function_id: string
          p_deployment_id: string
          p_version: string
          p_method: string
          p_status_code: number
          p_execution_time_ms: number
          p_event_message: string
          p_error_details?: Json
          p_timestamp?: string
        }
        Returns: string
      }
      pg_ping: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_job: {
        Args: {
          job_id: string
          status?: string
          title?: string
          description?: string
          metadata?: Json
        }
        Returns: Json
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
