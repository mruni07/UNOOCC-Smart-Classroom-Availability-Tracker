export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableShape<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          issue: string | null;
          message: string;
          name: string;
          role: string;
          room_id: string | null;
          topic: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          issue?: string | null;
          message: string;
          name: string;
          role: string;
          room_id?: string | null;
          topic: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          issue?: string | null;
          message?: string;
          name?: string;
          role?: string;
          room_id?: string | null;
          topic?: string;
        };
        Relationships: [];
      };
      faculty_updates: {
        Row: {
          approved_by: string | null;
          batch: string | null;
          created_at: string;
          created_by: string | null;
          date: string;
          end_time: string;
          faculty_id: string;
          id: string;
          name: string;
          notes: string | null;
          reason: string;
          room_id: string;
          start_time: string;
          status: string;
        };
        Insert: {
          approved_by?: string | null;
          batch?: string | null;
          created_at?: string;
          created_by?: string | null;
          date: string;
          end_time: string;
          faculty_id: string;
          id?: string;
          name: string;
          notes?: string | null;
          reason: string;
          room_id: string;
          start_time: string;
          status?: string;
        };
        Update: {
          approved_by?: string | null;
          batch?: string | null;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          end_time?: string;
          faculty_id?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          reason?: string;
          room_id?: string;
          start_time?: string;
          status?: string;
        };
        Relationships: [];
      };
      user_roles: TableShape<
        { user_id: string; role: "faculty" | "coordinator"; created_at: string },
        { user_id: string; role: "faculty" | "coordinator"; created_at?: string }
      >;
      rooms: TableShape<
        {
          room_id: string;
          building: string;
          floor: number;
          room_type: string | null;
          capacity: number | null;
          metadata_verified: boolean;
          is_active: boolean;
          created_at: string;
        },
        {
          room_id: string;
          building: string;
          floor: number;
          room_type?: string | null;
          capacity?: number | null;
          metadata_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
        }
      >;
      academic_terms: TableShape<
        {
          id: string;
          academic_session: string;
          semester: number;
          effective_from: string;
          effective_to: string | null;
          status: "active" | "archived";
          created_at: string;
        },
        {
          id?: string;
          academic_session: string;
          semester: number;
          effective_from: string;
          effective_to?: string | null;
          status?: "active" | "archived";
          created_at?: string;
        }
      >;
      timetable_documents: TableShape<
        {
          id: string;
          name: string;
          original_file_name: string;
          storage_path: string | null;
          mime_type: string;
          file_size_bytes: number | null;
          sha256: string | null;
          academic_term_id: string;
          department: string;
          programme: string;
          section: string;
          batch: string | null;
          effective_from: string;
          effective_to: string | null;
          status: string;
          uploaded_by: string | null;
          uploaded_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          activated_by: string | null;
          activated_at: string | null;
          review_notes: string | null;
          extracted_text: string | null;
        },
        {
          id?: string;
          name: string;
          original_file_name: string;
          storage_path?: string | null;
          mime_type: string;
          file_size_bytes?: number | null;
          sha256?: string | null;
          academic_term_id: string;
          department: string;
          programme: string;
          section: string;
          batch?: string | null;
          effective_from: string;
          effective_to?: string | null;
          status?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          activated_by?: string | null;
          activated_at?: string | null;
          review_notes?: string | null;
          extracted_text?: string | null;
        }
      >;
      timetable_entries: TableShape<
        {
          id: string;
          document_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          subject: string;
          course_code: string | null;
          room_id: string;
          section: string;
          batch: string | null;
          faculty: string | null;
          entry_type: string;
          source_text: string | null;
          confidence: number;
          review_state: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          document_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          subject: string;
          course_code?: string | null;
          room_id: string;
          section: string;
          batch?: string | null;
          faculty?: string | null;
          entry_type?: string;
          source_text?: string | null;
          confidence?: number;
          review_state?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_timetable: { Args: { p_document_id: string }; Returns: undefined };
      review_faculty_update: {
        Args: { p_update_id: string; p_approve: boolean };
        Returns: Tables<"faculty_updates">;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
