export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'member' | 'team_leader' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'deactivated'
export type ServiceType = 'tuesday' | 'thursday' | 'friday' | 'sunday'
export type AttendanceStatus = 'not_marked' | 'present' | 'absent' | 'excused'
export type AccountabilityTaskType = 'prayer' | 'bible_study'
export type AccountabilityStatus = 'upcoming' | 'in_progress' | 'ready' | 'completed' | 'missed'
export type ContentPublicationStatus = 'draft' | 'published' | 'archived'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          avatar_url: string | null
          phone: string | null
          role: AppRole
          status: AccountStatus
          bio: string | null
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          email: string
          avatar_url?: string | null
          phone?: string | null
          role?: AppRole
          status?: AccountStatus
          bio?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          avatar_url?: string | null
          phone?: string | null
          role?: AppRole
          status?: AccountStatus
          bio?: string | null
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Relationships: []
      }
      standing_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          is_single_occupancy: boolean
          is_active: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_single_occupancy?: boolean
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_single_occupancy?: boolean
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      standing_role_assignments: {
        Row: {
          id: string
          member_id: string
          standing_role_id: string
          assigned_by: string | null
          assigned_at: string
          revoked_at: string | null
          is_active: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          member_id: string
          standing_role_id: string
          assigned_by?: string | null
          assigned_at?: string
          revoked_at?: string | null
          is_active?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          standing_role_id?: string
          assigned_by?: string | null
          assigned_at?: string
          revoked_at?: string | null
          is_active?: boolean
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standing_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_role_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_role_assignments_standing_role_id_fkey"
            columns: ["standing_role_id"]
            isOneToOne: false
            referencedRelation: "standing_roles"
            referencedColumns: ["id"]
          }
        ]
      }
      services: {
        Row: {
          id: string
          service_type: ServiceType
          name: string
          day_of_week: number
          start_time: string
          end_time: string
          absence_deadline_hours: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_type: ServiceType
          name: string
          day_of_week: number
          start_time: string
          end_time: string
          absence_deadline_hours?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_type?: ServiceType
          name?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          absence_deadline_hours?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_occurrences: {
        Row: {
          id: string
          service_id: string
          service_type: ServiceType
          occurrence_date: string
          start_time: string
          end_time: string
          absence_deadline: string
          notes: string | null
          roster_published: boolean
          roster_published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          service_type: ServiceType
          occurrence_date: string
          start_time: string
          end_time: string
          absence_deadline: string
          notes?: string | null
          roster_published?: boolean
          roster_published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          service_type?: ServiceType
          occurrence_date?: string
          start_time?: string
          end_time?: string
          absence_deadline?: string
          notes?: string | null
          roster_published?: boolean
          roster_published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_occurrences_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      duty_posts: {
        Row: {
          id: string
          service_type: ServiceType
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          service_type: ServiceType
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          service_type?: ServiceType
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      duty_assignments: {
        Row: {
          id: string
          service_occurrence_id: string
          duty_post_id: string
          member_id: string
          assigned_by: string | null
          is_draft: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_occurrence_id: string
          duty_post_id: string
          member_id: string
          assigned_by?: string | null
          is_draft?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_occurrence_id?: string
          duty_post_id?: string
          member_id?: string
          assigned_by?: string | null
          is_draft?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_assignments_duty_post_id_fkey"
            columns: ["duty_post_id"]
            isOneToOne: false
            referencedRelation: "duty_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_assignments_service_occurrence_id_fkey"
            columns: ["service_occurrence_id"]
            isOneToOne: false
            referencedRelation: "service_occurrences"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_records: {
        Row: {
          id: string
          member_id: string
          service_occurrence_id: string
          status: AttendanceStatus
          marked_present_at: string | null
          marked_by: string | null
          correction_reason: string | null
          original_status: AttendanceStatus | null
          excused_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          service_occurrence_id: string
          status?: AttendanceStatus
          marked_present_at?: string | null
          marked_by?: string | null
          correction_reason?: string | null
          original_status?: AttendanceStatus | null
          excused_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          service_occurrence_id?: string
          status?: AttendanceStatus
          marked_present_at?: string | null
          marked_by?: string | null
          correction_reason?: string | null
          original_status?: AttendanceStatus | null
          excused_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_service_occurrence_id_fkey"
            columns: ["service_occurrence_id"]
            isOneToOne: false
            referencedRelation: "service_occurrences"
            referencedColumns: ["id"]
          }
        ]
      }
      accountability_schedules: {
        Row: {
          id: string
          member_id: string
          task_type: AccountabilityTaskType
          start_time: string
          duration_minutes: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          task_type: AccountabilityTaskType
          start_time: string
          duration_minutes: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          task_type?: AccountabilityTaskType
          start_time?: string
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_schedules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      accountability_completions: {
        Row: {
          id: string
          member_id: string
          schedule_id: string
          task_type: AccountabilityTaskType
          accountability_date: string
          scheduled_start: string
          duration_minutes: number
          completion_window_start: string
          completion_window_end: string
          completed_at: string | null
          status: AccountabilityStatus
          bible_book: string | null
          bible_start_chapter: number | null
          bible_start_verse: number | null
          bible_end_chapter: number | null
          bible_end_verse: number | null
          bible_reference_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          schedule_id: string
          task_type: AccountabilityTaskType
          accountability_date: string
          scheduled_start: string
          duration_minutes: number
          completion_window_start: string
          completion_window_end: string
          completed_at?: string | null
          status?: AccountabilityStatus
          bible_book?: string | null
          bible_start_chapter?: number | null
          bible_start_verse?: number | null
          bible_end_chapter?: number | null
          bible_end_verse?: number | null
          bible_reference_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          schedule_id?: string
          task_type?: AccountabilityTaskType
          accountability_date?: string
          scheduled_start?: string
          duration_minutes?: number
          completion_window_start?: string
          completion_window_end?: string
          completed_at?: string | null
          status?: AccountabilityStatus
          bible_book?: string | null
          bible_start_chapter?: number | null
          bible_start_verse?: number | null
          bible_end_chapter?: number | null
          bible_end_verse?: number | null
          bible_reference_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_completions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "accountability_schedules"
            referencedColumns: ["id"]
          }
        ]
      }
      dress_codes: {
        Row: {
          id: string
          applicable_sunday: string
          instructions: string
          image_url: string | null
          status: ContentPublicationStatus
          published_at: string | null
          published_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          applicable_sunday: string
          instructions: string
          image_url?: string | null
          status?: ContentPublicationStatus
          published_at?: string | null
          published_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          applicable_sunday?: string
          instructions?: string
          image_url?: string | null
          status?: ContentPublicationStatus
          published_at?: string | null
          published_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dress_codes_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      sermons: {
        Row: {
          id: string
          title: string
          preacher: string
          description: string | null
          spotify_url: string
          cover_image_url: string | null
          relevant_week: string
          is_current: boolean
          status: ContentPublicationStatus
          published_at: string | null
          published_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          preacher: string
          description?: string | null
          spotify_url: string
          cover_image_url?: string | null
          relevant_week: string
          is_current?: boolean
          status?: ContentPublicationStatus
          published_at?: string | null
          published_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          preacher?: string
          description?: string | null
          spotify_url?: string
          cover_image_url?: string | null
          relevant_week?: string
          is_current?: boolean
          status?: ContentPublicationStatus
          published_at?: string | null
          published_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermons_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string
          status: ContentPublicationStatus
          published_at: string | null
          published_by: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          status?: ContentPublicationStatus
          published_at?: string | null
          published_by?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          status?: ContentPublicationStatus
          published_at?: string | null
          published_by?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      content_settings: {
        Row: {
          key: string
          value: string | null
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: string | null
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string | null
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_name: string | null
          action: string
          target_table: string | null
          target_id: string | null
          before_value: Json | null
          after_value: Json | null
          reason: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          action: string
          target_table?: string | null
          target_id?: string | null
          before_value?: Json | null
          after_value?: Json | null
          reason?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          action?: string
          target_table?: string | null
          target_id?: string | null
          before_value?: Json | null
          after_value?: Json | null
          reason?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: AppRole
      account_status: AccountStatus
      service_type: ServiceType
      attendance_status: AttendanceStatus
      accountability_task_type: AccountabilityTaskType
      accountability_status: AccountabilityStatus
      content_publication_status: ContentPublicationStatus
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type ProfileInsert = InsertTables<'profiles'>
export type ProfileUpdate = UpdateTables<'profiles'>

export type StandingRole = Tables<'standing_roles'>
export type StandingRoleInsert = InsertTables<'standing_roles'>
export type StandingRoleUpdate = UpdateTables<'standing_roles'>

export type StandingRoleAssignment = Tables<'standing_role_assignments'>
export type StandingRoleAssignmentInsert = InsertTables<'standing_role_assignments'>
export type StandingRoleAssignmentUpdate = UpdateTables<'standing_role_assignments'>

export type Service = Tables<'services'>
export type ServiceInsert = InsertTables<'services'>
export type ServiceUpdate = UpdateTables<'services'>

export type ServiceOccurrence = Tables<'service_occurrences'>
export type ServiceOccurrenceInsert = InsertTables<'service_occurrences'>
export type ServiceOccurrenceUpdate = UpdateTables<'service_occurrences'>

export type DutyPost = Tables<'duty_posts'>
export type DutyPostInsert = InsertTables<'duty_posts'>
export type DutyPostUpdate = UpdateTables<'duty_posts'>

export type DutyAssignment = Tables<'duty_assignments'>
export type DutyAssignmentInsert = InsertTables<'duty_assignments'>
export type DutyAssignmentUpdate = UpdateTables<'duty_assignments'>

export type AttendanceRecord = Tables<'attendance_records'>
export type AttendanceRecordInsert = InsertTables<'attendance_records'>
export type AttendanceRecordUpdate = UpdateTables<'attendance_records'>

export type AccountabilitySchedule = Tables<'accountability_schedules'>
export type AccountabilityScheduleInsert = InsertTables<'accountability_schedules'>
export type AccountabilityScheduleUpdate = UpdateTables<'accountability_schedules'>

export type AccountabilityCompletion = Tables<'accountability_completions'>
export type AccountabilityCompletionInsert = InsertTables<'accountability_completions'>
export type AccountabilityCompletionUpdate = UpdateTables<'accountability_completions'>

export type DressCode = Tables<'dress_codes'>
export type DressCodeInsert = InsertTables<'dress_codes'>
export type DressCodeUpdate = UpdateTables<'dress_codes'>

export type Sermon = Tables<'sermons'>
export type SermonInsert = InsertTables<'sermons'>
export type SermonUpdate = UpdateTables<'sermons'>

export type Announcement = Tables<'announcements'>
export type AnnouncementInsert = InsertTables<'announcements'>
export type AnnouncementUpdate = UpdateTables<'announcements'>

export type ContentSetting = Tables<'content_settings'>
export type ContentSettingInsert = InsertTables<'content_settings'>
export type ContentSettingUpdate = UpdateTables<'content_settings'>

export type AuditLog = Tables<'audit_logs'>
export type AuditLogInsert = InsertTables<'audit_logs'>
export type AuditLogUpdate = UpdateTables<'audit_logs'>
