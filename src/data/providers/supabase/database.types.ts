
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "appointments": {
                  Row: {
                    "author_id": string,"child_id": string | null,"created_at": string,"family_id": string,"id": string,"location": string | null,"notes": string | null,"pregnancy_id": string | null,"start_date": string,"start_time": string,"time_zone": string,"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"child_id"?: string | null,"created_at"?: string,"family_id": string,"id"?: string,"location"?: string | null,"notes"?: string | null,"pregnancy_id"?: string | null,"start_date": string,"start_time": string,"time_zone": string,"title": string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "author_id"?: string,"child_id"?: string | null,"created_at"?: string,"family_id"?: string,"id"?: string,"location"?: string | null,"notes"?: string | null,"pregnancy_id"?: string | null,"start_date"?: string,"start_time"?: string,"time_zone"?: string,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_child_id_family_id_fkey"
      columns: ["child_id","family_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "appointments_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_pregnancy_id_family_id_fkey"
      columns: ["pregnancy_id","family_id"]
isOneToOne: false
      referencedRelation: "pregnancies"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"children": {
                  Row: {
                    "archived_at": string | null,"avatar_media_id": string | null,"avatar_purpose": Database["public"]['Enums']["media_purpose"],"birth_date": string,"birth_time": string | null,"create_request_id": string | null,"created_at": string,"created_by": string,"family_id": string,"id": string,"name": string,"origin_pregnancy_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"avatar_media_id"?: string | null,"avatar_purpose"?: Database["public"]['Enums']["media_purpose"],"birth_date": string,"birth_time"?: string | null,"create_request_id"?: string | null,"created_at"?: string,"created_by": string,"family_id": string,"id"?: string,"name": string,"origin_pregnancy_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"avatar_media_id"?: string | null,"avatar_purpose"?: Database["public"]['Enums']["media_purpose"],"birth_date"?: string,"birth_time"?: string | null,"create_request_id"?: string | null,"created_at"?: string,"created_by"?: string,"family_id"?: string,"id"?: string,"name"?: string,"origin_pregnancy_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "children_avatar_media_id_family_id_avatar_purpose_fkey"
      columns: ["avatar_media_id","family_id","avatar_purpose"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id","family_id","purpose"]
    },{
      foreignKeyName: "children_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "children_origin_pregnancy_id_family_id_fkey"
      columns: ["origin_pregnancy_id","family_id"]
isOneToOne: false
      referencedRelation: "pregnancies"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"families": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"family_invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"expires_at": string,"family_id": string,"id": string,"invited_by": string,"relationship_label": string,"revoked_at": string | null,"role": Database["public"]['Enums']["family_role"],"status": Database["public"]['Enums']["invitation_status"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"expires_at": string,"family_id": string,"id"?: string,"invited_by": string,"relationship_label": string,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["family_role"],"status"?: Database["public"]['Enums']["invitation_status"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"expires_at"?: string,"family_id"?: string,"id"?: string,"invited_by"?: string,"relationship_label"?: string,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["family_role"],"status"?: Database["public"]['Enums']["invitation_status"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_invitations_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"family_memberships": {
                  Row: {
                    "display_name": string,"ended_at": string | null,"family_id": string,"id": string,"joined_at": string,"relationship_label": string,"role": Database["public"]['Enums']["family_role"],"status": Database["public"]['Enums']["membership_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name": string,"ended_at"?: string | null,"family_id": string,"id"?: string,"joined_at"?: string,"relationship_label": string,"role": Database["public"]['Enums']["family_role"],"status"?: Database["public"]['Enums']["membership_status"],"user_id": string
                  }
                  Update: {
                    "display_name"?: string,"ended_at"?: string | null,"family_id"?: string,"id"?: string,"joined_at"?: string,"relationship_label"?: string,"role"?: Database["public"]['Enums']["family_role"],"status"?: Database["public"]['Enums']["membership_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_memberships_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"growth_measurements": {
                  Row: {
                    "author_id": string,"canonical_value": number,"child_id": string,"created_at": string,"entered_unit": string,"family_id": string,"id": string,"is_birth_measurement": boolean,"kind": string,"measured_on": string,"method": string | null,"note": string | null,"source": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"canonical_value": number,"child_id": string,"created_at"?: string,"entered_unit": string,"family_id": string,"id"?: string,"is_birth_measurement"?: boolean,"kind": string,"measured_on": string,"method"?: string | null,"note"?: string | null,"source"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"canonical_value"?: number,"child_id"?: string,"created_at"?: string,"entered_unit"?: string,"family_id"?: string,"id"?: string,"is_birth_measurement"?: boolean,"kind"?: string,"measured_on"?: string,"method"?: string | null,"note"?: string | null,"source"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "growth_measurements_child_id_family_id_fkey"
      columns: ["child_id","family_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "growth_measurements_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "byte_size": number,"created_at": string,"family_id": string,"height": number,"id": string,"mime_type": string,"purpose": Database["public"]['Enums']["media_purpose"],"ready_at": string | null,"status": Database["public"]['Enums']["media_status"],"storage_key": string,"uploaded_by": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "byte_size": number,"created_at"?: string,"family_id": string,"height": number,"id"?: string,"mime_type": string,"purpose": Database["public"]['Enums']["media_purpose"],"ready_at"?: string | null,"status"?: Database["public"]['Enums']["media_status"],"storage_key": string,"uploaded_by": string,"width": number
                  }
                  Update: {
                    "byte_size"?: number,"created_at"?: string,"family_id"?: string,"height"?: number,"id"?: string,"mime_type"?: string,"purpose"?: Database["public"]['Enums']["media_purpose"],"ready_at"?: string | null,"status"?: Database["public"]['Enums']["media_status"],"storage_key"?: string,"uploaded_by"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_assets_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"memories": {
                  Row: {
                    "author_id": string,"body": string | null,"child_id": string | null,"client_request_id": string,"created_at": string,"event_date": string,"family_id": string,"id": string,"last_request_id": string | null,"pregnancy_id": string | null,"title": string | null,"updated_at": string,"version": number,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body"?: string | null,"child_id"?: string | null,"client_request_id": string,"created_at"?: string,"event_date": string,"family_id": string,"id"?: string,"last_request_id"?: string | null,"pregnancy_id"?: string | null,"title"?: string | null,"updated_at"?: string,"version"?: number,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "author_id"?: string,"body"?: string | null,"child_id"?: string | null,"client_request_id"?: string,"created_at"?: string,"event_date"?: string,"family_id"?: string,"id"?: string,"last_request_id"?: string | null,"pregnancy_id"?: string | null,"title"?: string | null,"updated_at"?: string,"version"?: number,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "memories_child_id_family_id_fkey"
      columns: ["child_id","family_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "memories_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memories_pregnancy_id_family_id_fkey"
      columns: ["pregnancy_id","family_id"]
isOneToOne: false
      referencedRelation: "pregnancies"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"memory_media": {
                  Row: {
                    "family_id": string,"media_id": string,"media_purpose": Database["public"]['Enums']["media_purpose"],"memory_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "family_id": string,"media_id": string,"media_purpose"?: Database["public"]['Enums']["media_purpose"],"memory_id": string,"position": number
                  }
                  Update: {
                    "family_id"?: string,"media_id"?: string,"media_purpose"?: Database["public"]['Enums']["media_purpose"],"memory_id"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "memory_media_media_id_family_id_media_purpose_fkey"
      columns: ["media_id","family_id","media_purpose"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id","family_id","purpose"]
    },{
      foreignKeyName: "memory_media_memory_id_family_id_fkey"
      columns: ["memory_id","family_id"]
isOneToOne: false
      referencedRelation: "memories"
      referencedColumns: ["id","family_id"]
    }
                  ]
                },"pregnancies": {
                  Row: {
                    "birth_request_id": string | null,"clinician_due_date": string | null,"content_hidden": boolean,"created_at": string,"created_by": string,"family_id": string,"id": string,"last_menstrual_period": string | null,"nickname": string | null,"reminders_paused": boolean,"status": Database["public"]['Enums']["pregnancy_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_request_id"?: string | null,"clinician_due_date"?: string | null,"content_hidden"?: boolean,"created_at"?: string,"created_by": string,"family_id": string,"id"?: string,"last_menstrual_period"?: string | null,"nickname"?: string | null,"reminders_paused"?: boolean,"status"?: Database["public"]['Enums']["pregnancy_status"],"updated_at"?: string
                  }
                  Update: {
                    "birth_request_id"?: string | null,"clinician_due_date"?: string | null,"content_hidden"?: boolean,"created_at"?: string,"created_by"?: string,"family_id"?: string,"id"?: string,"last_menstrual_period"?: string | null,"nickname"?: string | null,"reminders_paused"?: boolean,"status"?: Database["public"]['Enums']["pregnancy_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pregnancies_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"user_preferences": {
                  Row: {
                    "active_family_id": string | null,"locale": string,"measurement_system": string,"selected_child_id": string | null,"selected_pregnancy_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_family_id"?: string | null,"locale"?: string,"measurement_system"?: string,"selected_child_id"?: string | null,"selected_pregnancy_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "active_family_id"?: string | null,"locale"?: string,"measurement_system"?: string,"selected_child_id"?: string | null,"selected_pregnancy_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_preferences_active_family_id_fkey"
      columns: ["active_family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_preferences_selected_child_id_fkey"
      columns: ["selected_child_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_preferences_selected_pregnancy_id_fkey"
      columns: ["selected_pregnancy_id"]
isOneToOne: false
      referencedRelation: "pregnancies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_display_name": string,"p_token": string }; Returns: {
              "family_id": string,"result": string
            }[]
                           },
"create_child":
{ Args: { "p_birth_date": string,"p_birth_time": string,"p_family_id": string,"p_measurements": Json,"p_name": string,"p_request_id": string }; Returns: string
                           },
"create_family":
{ Args: { "p_display_name": string,"p_family_name": string,"p_relationship_label": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_family_id": string,"p_relationship_label": string }; Returns: {
              "expires_at": string,"invitation_id": string,"token": string
            }[]
                           },
"finalize_memory":
{ Args: { "p_body": string,"p_child_id": string,"p_client_request_id": string,"p_event_date": string,"p_expected_version": number,"p_family_id": string,"p_media_ids": (string)[],"p_memory_id": string,"p_pregnancy_id": string,"p_title": string,"p_visibility": Database["public"]['Enums']["visibility"] }; Returns: string
                           },
"leave_family":
{ Args: { "p_family_id": string }; Returns: undefined
                           },
"record_birth":
{ Args: { "p_children": Json,"p_pregnancy_id": string,"p_request_id": string }; Returns: string[]
                           },
"reserve_media_upload":
{ Args: { "p_byte_size": number,"p_family_id": string,"p_height": number,"p_mime_type": string,"p_purpose": Database["public"]['Enums']["media_purpose"],"p_width": number }; Returns: {
              "media_id": string,"storage_key": string
            }[]
                           },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           },
"revoke_member":
{ Args: { "p_membership_id": string }; Returns: undefined
                           },
"set_active_family":
{ Args: { "p_family_id": string }; Returns: undefined
                           },
"set_child_archived":
{ Args: { "p_archived": boolean,"p_child_id": string }; Returns: undefined
                           },
"set_child_avatar":
{ Args: { "p_child_id": string,"p_media_id": string }; Returns: undefined
                           },
"transfer_ownership":
{ Args: { "p_family_id": string,"p_to_membership_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "family_role": "owner"|"adult","invitation_status": "pending"|"accepted"|"revoked","media_purpose": "memory"|"avatar","media_status": "pending"|"ready"|"orphaned","membership_status": "active"|"revoked"|"left","pregnancy_status": "active"|"born"|"ended"|"archived","visibility": "family"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "family_role": ["owner", "adult"],"invitation_status": ["pending", "accepted", "revoked"],"media_purpose": ["memory", "avatar"],"media_status": ["pending", "ready", "orphaned"],"membership_status": ["active", "revoked", "left"],"pregnancy_status": ["active", "born", "ended", "archived"],"visibility": ["family", "private"]
          }
        }
} as const
