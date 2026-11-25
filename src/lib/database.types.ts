// Generated from supabase/migrations. Regenerate with: supabase gen types typescript --local
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      appraisals: {
        Row: {
          id: number
          profile_id: string | null
          project_name: string | null
          firm_name: string | null
          feedback: number
          owner: number
          formatting: number
          enthusiasm: number
          detail: number
          submitted_by: string | null
          submitted_at: string | null
          client_remarks: string | null
          admin_remark: string | null
        }
        Insert: {
          id?: number
          profile_id?: string | null
          project_name?: string | null
          firm_name?: string | null
          feedback?: number
          owner?: number
          formatting?: number
          enthusiasm?: number
          detail?: number
          submitted_by?: string | null
          submitted_at?: string | null
          client_remarks?: string | null
          admin_remark?: string | null
        }
        Update: {
          id?: number
          profile_id?: string | null
          project_name?: string | null
          firm_name?: string | null
          feedback?: number
          owner?: number
          formatting?: number
          enthusiasm?: number
          detail?: number
          submitted_by?: string | null
          submitted_at?: string | null
          client_remarks?: string | null
          admin_remark?: string | null
        }
        Relationships: [
          { foreignKeyName: "appraisals_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "appraisals_submitted_by_fkey"; columns: ["submitted_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      attendance: {
        Row: {
          id: number
          profile_id: string
          work_date: string
          in_time: string | null
          out_time: string | null
          status: string | null
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          profile_id: string
          work_date: string
          in_time?: string | null
          out_time?: string | null
          status?: string | null
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          profile_id?: string
          work_date?: string
          in_time?: string | null
          out_time?: string | null
          status?: string | null
          added_by?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "attendance_added_by_fkey"; columns: ["added_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "attendance_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      audit_log: {
        Row: {
          id: number
          at: string
          actor_id: string | null
          action: string
          entity: string
          entity_id: string | null
          details: Json | null
        }
        Insert: {
          id?: number
          at?: string
          actor_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          details?: Json | null
        }
        Update: {
          id?: number
          at?: string
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          details?: Json | null
        }
        Relationships: [
          { foreignKeyName: "audit_log_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      circulars: {
        Row: {
          id: number
          title: string
          file_path: string
          entered_by: string | null
          entered_on: string | null
          active: boolean
          deleted_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: number
          title: string
          file_path: string
          entered_by?: string | null
          entered_on?: string | null
          active?: boolean
          deleted_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          file_path?: string
          entered_by?: string | null
          entered_on?: string | null
          active?: boolean
          deleted_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "circulars_deleted_by_fkey"; columns: ["deleted_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "circulars_entered_by_fkey"; columns: ["entered_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      client_contacts: {
        Row: {
          id: number
          client_id: number
          name: string
          designation: string | null
          email: string | null
          phone: string | null
          address: string | null
          place: string | null
        }
        Insert: {
          id?: number
          client_id: number
          name: string
          designation?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          place?: string | null
        }
        Update: {
          id?: number
          client_id?: number
          name?: string
          designation?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          place?: string | null
        }
        Relationships: [
          { foreignKeyName: "client_contacts_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] }
        ]
      }
      clients: {
        Row: {
          id: number
          firm_name: string | null
          designation: string | null
          email: string | null
          address: string | null
          phone: string | null
          sector: string | null
          pan: string | null
          gstin: string | null
          state_code: string | null
          priority: number
          active: boolean
          entered_by: string | null
          entered_at: string | null
        }
        Insert: {
          id?: number
          firm_name?: string | null
          designation?: string | null
          email?: string | null
          address?: string | null
          phone?: string | null
          sector?: string | null
          pan?: string | null
          gstin?: string | null
          state_code?: string | null
          priority?: number
          active?: boolean
          entered_by?: string | null
          entered_at?: string | null
        }
        Update: {
          id?: number
          firm_name?: string | null
          designation?: string | null
          email?: string | null
          address?: string | null
          phone?: string | null
          sector?: string | null
          pan?: string | null
          gstin?: string | null
          state_code?: string | null
          priority?: number
          active?: boolean
          entered_by?: string | null
          entered_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "clients_entered_by_fkey"; columns: ["entered_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      costing_grades: {
        Row: {
          id: number
          grade: string
          cost: number
          active: boolean
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          grade: string
          cost: number
          active?: boolean
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          grade?: string
          cost?: number
          active?: boolean
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "costing_grades_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      departments: {
        Row: {
          id: number
          name: string
          active: boolean
          has_sub: boolean
        }
        Insert: {
          id?: number
          name: string
          active?: boolean
          has_sub?: boolean
        }
        Update: {
          id?: number
          name?: string
          active?: boolean
          has_sub?: boolean
        }
        Relationships: [
        ]
      }
      employee_details: {
        Row: {
          id: number
          legacy_id: number | null
          empid: string
          profile_id: string | null
          name: string
          designation: string | null
          email: string | null
          category: string | null
          grade: string | null
          salary: number | null
          cv_path: string | null
          docs_path: string | null
          address: string | null
          contact: string | null
          join_date: string | null
          dob: string | null
          bank: string | null
          gender: string | null
          department: string | null
          supervisor: string | null
          emp_code: string | null
          created_at: string
        }
        Insert: {
          id?: number
          legacy_id?: number | null
          empid: string
          profile_id?: string | null
          name: string
          designation?: string | null
          email?: string | null
          category?: string | null
          grade?: string | null
          salary?: number | null
          cv_path?: string | null
          docs_path?: string | null
          address?: string | null
          contact?: string | null
          join_date?: string | null
          dob?: string | null
          bank?: string | null
          gender?: string | null
          department?: string | null
          supervisor?: string | null
          emp_code?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          legacy_id?: number | null
          empid?: string
          profile_id?: string | null
          name?: string
          designation?: string | null
          email?: string | null
          category?: string | null
          grade?: string | null
          salary?: number | null
          cv_path?: string | null
          docs_path?: string | null
          address?: string | null
          contact?: string | null
          join_date?: string | null
          dob?: string | null
          bank?: string | null
          gender?: string | null
          department?: string | null
          supervisor?: string | null
          emp_code?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "employee_details_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      followups: {
        Row: {
          id: number
          client_id: number | null
          lead_id: number | null
          project_id: number | null
          prospect_name: string | null
          reason: string | null
          reply: string | null
          description: string | null
          next_followup_on: string | null
          file_path: string | null
          file_description: string | null
          entered_by: string | null
          entered_at: string | null
        }
        Insert: {
          id?: number
          client_id?: number | null
          lead_id?: number | null
          project_id?: number | null
          prospect_name?: string | null
          reason?: string | null
          reply?: string | null
          description?: string | null
          next_followup_on?: string | null
          file_path?: string | null
          file_description?: string | null
          entered_by?: string | null
          entered_at?: string | null
        }
        Update: {
          id?: number
          client_id?: number | null
          lead_id?: number | null
          project_id?: number | null
          prospect_name?: string | null
          reason?: string | null
          reply?: string | null
          description?: string | null
          next_followup_on?: string | null
          file_path?: string | null
          file_description?: string | null
          entered_by?: string | null
          entered_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "followups_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "followups_entered_by_fkey"; columns: ["entered_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "followups_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "followups_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      holidays: {
        Row: {
          id: number
          holiday_date: string
          description: string
        }
        Insert: {
          id?: number
          holiday_date: string
          description: string
        }
        Update: {
          id?: number
          holiday_date?: string
          description?: string
        }
        Relationships: [
        ]
      }
      incentives: {
        Row: {
          id: number
          profile_id: string
          incentive_date: string | null
          reason: string | null
          amount: number
        }
        Insert: {
          id?: number
          profile_id: string
          incentive_date?: string | null
          reason?: string | null
          amount: number
        }
        Update: {
          id?: number
          profile_id?: string
          incentive_date?: string | null
          reason?: string | null
          amount?: number
        }
        Relationships: [
          { foreignKeyName: "incentives_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      invoice_counters: {
        Row: {
          invoice_by: string
          series: string
          last_number: number
        }
        Insert: {
          invoice_by: string
          series: string
          last_number?: number
        }
        Update: {
          invoice_by?: string
          series?: string
          last_number?: number
        }
        Relationships: [
        ]
      }
      invoices: {
        Row: {
          id: number
          project_id: number | null
          invoice_no: string
          invoice_type: string
          invoice_by: string
          invoice_by_type: string | null
          invoice_date: string | null
          place_of_supply: string | null
          recipient_name: string | null
          recipient_address: string | null
          recipient_pan: string | null
          recipient_gst: string | null
          recipient_state_code: string | null
          delivery_name: string | null
          delivery_address: string | null
          delivery_pan: string | null
          delivery_gst: string | null
          delivery_state_code: string | null
          advance: number | null
          discount: number | null
          ope: number | null
          currency_type: string | null
          currency_ope: number | null
          confirmed: boolean
          confirmed_by: string | null
          confirmed_at: string | null
          converted: boolean
          created_by: string | null
          created_at: string | null
          deleted_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: number
          project_id?: number | null
          invoice_no: string
          invoice_type: string
          invoice_by?: string
          invoice_by_type?: string | null
          invoice_date?: string | null
          place_of_supply?: string | null
          recipient_name?: string | null
          recipient_address?: string | null
          recipient_pan?: string | null
          recipient_gst?: string | null
          recipient_state_code?: string | null
          delivery_name?: string | null
          delivery_address?: string | null
          delivery_pan?: string | null
          delivery_gst?: string | null
          delivery_state_code?: string | null
          advance?: number | null
          discount?: number | null
          ope?: number | null
          currency_type?: string | null
          currency_ope?: number | null
          confirmed?: boolean
          confirmed_by?: string | null
          confirmed_at?: string | null
          converted?: boolean
          created_by?: string | null
          created_at?: string | null
          deleted_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number | null
          invoice_no?: string
          invoice_type?: string
          invoice_by?: string
          invoice_by_type?: string | null
          invoice_date?: string | null
          place_of_supply?: string | null
          recipient_name?: string | null
          recipient_address?: string | null
          recipient_pan?: string | null
          recipient_gst?: string | null
          recipient_state_code?: string | null
          delivery_name?: string | null
          delivery_address?: string | null
          delivery_pan?: string | null
          delivery_gst?: string | null
          delivery_state_code?: string | null
          advance?: number | null
          discount?: number | null
          ope?: number | null
          currency_type?: string | null
          currency_ope?: number | null
          confirmed?: boolean
          confirmed_by?: string | null
          confirmed_at?: string | null
          converted?: boolean
          created_by?: string | null
          created_at?: string | null
          deleted_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "invoices_confirmed_by_fkey"; columns: ["confirmed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_deleted_by_fkey"; columns: ["deleted_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      notifications: {
        Row: { id: number; profile_id: string; kind: string; title: string; body: string | null; href: string | null; actor_id: string | null; dedupe_key: string | null; created_at: string; read_at: string | null; emailed_at: string | null }
        Insert: { id?: number; profile_id: string; kind: string; title: string; body?: string | null; href?: string | null; actor_id?: string | null; dedupe_key?: string | null; created_at?: string; read_at?: string | null; emailed_at?: string | null }
        Update: { id?: number; profile_id?: string; kind?: string; title?: string; body?: string | null; href?: string | null; actor_id?: string | null; dedupe_key?: string | null; created_at?: string; read_at?: string | null; emailed_at?: string | null }
        Relationships: [
          { foreignKeyName: "notifications_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      notification_prefs: {
        Row: { profile_id: string; email_enabled: boolean }
        Insert: { profile_id: string; email_enabled?: boolean }
        Update: { profile_id?: string; email_enabled?: boolean }
        Relationships: []
      }
      appraisal_cycles: {
        Row: { id: number; name: string; period_from: string; period_to: string; status: string; published_at: string | null; created_by: string | null; created_at: string; closed_at: string | null }
        Insert: { id?: number; name: string; period_from: string; period_to: string; status?: string; published_at?: string | null; created_by?: string | null; created_at?: string; closed_at?: string | null }
        Update: { id?: number; name?: string; period_from?: string; period_to?: string; status?: string; published_at?: string | null; created_by?: string | null; created_at?: string; closed_at?: string | null }
        Relationships: []
      }
      appraisal_results: {
        Row: { id: number; cycle_id: number; profile_id: string; total: number | null; band: string | null; parts: Json; weights: Json; review_count: number; final_rating: number | null; admin_remark: string | null; rated_by: string | null; rated_at: string | null; employee_comment: string | null; acknowledged_at: string | null }
        Insert: { id?: number; cycle_id: number; profile_id: string; total?: number | null; band?: string | null; parts?: Json; weights?: Json; review_count?: number; final_rating?: number | null; admin_remark?: string | null; rated_by?: string | null; rated_at?: string | null; employee_comment?: string | null; acknowledged_at?: string | null }
        Update: { id?: number; cycle_id?: number; profile_id?: string; total?: number | null; band?: string | null; parts?: Json; weights?: Json; review_count?: number; final_rating?: number | null; admin_remark?: string | null; rated_by?: string | null; rated_at?: string | null; employee_comment?: string | null; acknowledged_at?: string | null }
        Relationships: [
          { foreignKeyName: "appraisal_results_cycle_id_fkey"; columns: ["cycle_id"]; isOneToOne: false; referencedRelation: "appraisal_cycles"; referencedColumns: ["id"] },
          { foreignKeyName: "appraisal_results_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      performance_reviews: {
        Row: { id: number; profile_id: string; project_id: number; reviewer_id: string; review_month: string; followup: number; ownership: number; accuracy: number; enthusiasm: number; detail: number; comments: string | null; created_at: string }
        Insert: { id?: number; profile_id: string; project_id: number; reviewer_id: string; review_month: string; followup: number; ownership: number; accuracy: number; enthusiasm: number; detail: number; comments?: string | null; created_at?: string }
        Update: { id?: number; profile_id?: string; project_id?: number; reviewer_id?: string; review_month?: string; followup?: number; ownership?: number; accuracy?: number; enthusiasm?: number; detail?: number; comments?: string | null; created_at?: string }
        Relationships: [
          { foreignKeyName: "performance_reviews_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "performance_reviews_reviewer_id_fkey"; columns: ["reviewer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "performance_reviews_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      score_weights: {
        Row: { key: string; label: string; weight: number; sort: number }
        Insert: { key: string; label: string; weight: number; sort: number }
        Update: { key?: string; label?: string; weight?: number; sort?: number }
        Relationships: []
      }
      invoice_lines: {
        Row: { id: number; invoice_id: number; position: number; service_description: string | null; sac: string | null; taxable_value: number; rupee_value: number | null }
        Insert: { id?: number; invoice_id: number; position?: number; service_description?: string | null; sac?: string | null; taxable_value?: number; rupee_value?: number | null }
        Update: { id?: number; invoice_id?: number; position?: number; service_description?: string | null; sac?: string | null; taxable_value?: number; rupee_value?: number | null }
        Relationships: [
          { foreignKeyName: "invoice_lines_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] }
        ]
      }
      leads: {
        Row: {
          id: number
          name: string
          client_id: number | null
          service: string | null
          comments: string | null
          source: string | null
          cost_type: string | null
          category: string | null
          lead_generator: string | null
          lead_handler: string | null
          status: string
          reject_reason: string | null
          rejected_by: string | null
          rejected_at: string | null
          approved_by: string | null
          approved_at: string | null
          approved_project_id: number | null
          entered_by: string | null
          entered_at: string | null
        }
        Insert: {
          id?: number
          name: string
          client_id?: number | null
          service?: string | null
          comments?: string | null
          source?: string | null
          cost_type?: string | null
          category?: string | null
          lead_generator?: string | null
          lead_handler?: string | null
          status?: string
          reject_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approved_project_id?: number | null
          entered_by?: string | null
          entered_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          client_id?: number | null
          service?: string | null
          comments?: string | null
          source?: string | null
          cost_type?: string | null
          category?: string | null
          lead_generator?: string | null
          lead_handler?: string | null
          status?: string
          reject_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approved_project_id?: number | null
          entered_by?: string | null
          entered_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "leads_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_approved_project_id_fkey"; columns: ["approved_project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_entered_by_fkey"; columns: ["entered_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_lead_generator_fkey"; columns: ["lead_generator"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_lead_handler_fkey"; columns: ["lead_handler"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_rejected_by_fkey"; columns: ["rejected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      leave_applications: {
        Row: {
          id: number
          profile_id: string
          leave_from: string
          leave_to: string
          applied_on: string | null
          reason: string | null
          leave_type: string
          num_days: number
          status: string
          changed_by: string | null
          changed_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          profile_id: string
          leave_from: string
          leave_to: string
          applied_on?: string | null
          reason?: string | null
          leave_type: string
          num_days?: number
          status?: string
          changed_by?: string | null
          changed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          profile_id?: string
          leave_from?: string
          leave_to?: string
          applied_on?: string | null
          reason?: string | null
          leave_type?: string
          num_days?: number
          status?: string
          changed_by?: string | null
          changed_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "leave_applications_changed_by_fkey"; columns: ["changed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leave_applications_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      leave_quota: {
        Row: {
          id: number
          profile_id: string
          casual: number | null
          privilege: number | null
        }
        Insert: {
          id?: number
          profile_id: string
          casual?: number | null
          privilege?: number | null
        }
        Update: {
          id?: number
          profile_id?: string
          casual?: number | null
          privilege?: number | null
        }
        Relationships: [
          { foreignKeyName: "leave_quota_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      overheads: {
        Row: {
          id: number
          cost: number
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          cost: number
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          cost?: number
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "overheads_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      pre_projects: {
        Row: {
          id: number
          entered_by: string | null
          firm_name: string | null
          firm_address: string | null
          firm_sector: string | null
          meeting_reason: string | null
          project_name: string | null
          description: string | null
          conclusion: string | null
          status: string
          proposal_team: string | null
          proposal_doc: string | null
          keywords: string | null
          remarks: string | null
          created_at: string
        }
        Insert: {
          id?: number
          entered_by?: string | null
          firm_name?: string | null
          firm_address?: string | null
          firm_sector?: string | null
          meeting_reason?: string | null
          project_name?: string | null
          description?: string | null
          conclusion?: string | null
          status?: string
          proposal_team?: string | null
          proposal_doc?: string | null
          keywords?: string | null
          remarks?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          entered_by?: string | null
          firm_name?: string | null
          firm_address?: string | null
          firm_sector?: string | null
          meeting_reason?: string | null
          project_name?: string | null
          description?: string | null
          conclusion?: string | null
          status?: string
          proposal_team?: string | null
          proposal_doc?: string | null
          keywords?: string | null
          remarks?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "pre_projects_entered_by_fkey"; columns: ["entered_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      profiles: {
        Row: {
          id: string
          legacy_id: number | null
          empid: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          active: boolean
          currently_working_on: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          legacy_id?: number | null
          empid: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          active?: boolean
          currently_working_on?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          legacy_id?: number | null
          empid?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          active?: boolean
          currently_working_on?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
        ]
      }
      project_completions: {
        Row: {
          id: number
          project_id: number
          milestone_id: number | null
          percent_complete: number
          reason: string | null
          entry_by: string | null
          entry_at: string | null
        }
        Insert: {
          id?: number
          project_id: number
          milestone_id?: number | null
          percent_complete: number
          reason?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number
          milestone_id?: number | null
          percent_complete?: number
          reason?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_completions_entry_by_fkey"; columns: ["entry_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_completions_milestone_id_fkey"; columns: ["milestone_id"]; isOneToOne: false; referencedRelation: "project_milestones"; referencedColumns: ["id"] },
          { foreignKeyName: "project_completions_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      project_costing: {
        Row: {
          id: number
          project_id: number | null
          lead_id: number | null
          client_id: number | null
          grade_label: string
          grade: string
          num_employees: number
          total_hours: number
          overheads: number
          multiply_factor: number
          total_cost: number
          actual_total_cost: number
          renegotiated_cost: number | null
          active: boolean
          added_by: string | null
          added_at: string | null
          approved_reason: string | null
          approved_by: string | null
          approved_at: string | null
          rejected_reason: string | null
          rejected_by: string | null
          rejected_at: string | null
        }
        Insert: {
          id?: number
          project_id?: number | null
          lead_id?: number | null
          client_id?: number | null
          grade_label: string
          grade: string
          num_employees?: number
          total_hours?: number
          overheads?: number
          multiply_factor?: number
          total_cost?: number
          actual_total_cost?: number
          renegotiated_cost?: number | null
          active?: boolean
          added_by?: string | null
          added_at?: string | null
          approved_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number | null
          lead_id?: number | null
          client_id?: number | null
          grade_label?: string
          grade?: string
          num_employees?: number
          total_hours?: number
          overheads?: number
          multiply_factor?: number
          total_cost?: number
          actual_total_cost?: number
          renegotiated_cost?: number | null
          active?: boolean
          added_by?: string | null
          added_at?: string | null
          approved_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_costing_added_by_fkey"; columns: ["added_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_costing_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_costing_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "project_costing_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "project_costing_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "project_costing_rejected_by_fkey"; columns: ["rejected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      project_documents: {
        Row: {
          id: number
          project_id: number | null
          lead_id: number | null
          file_path: string | null
          description: string | null
          entry_by: string | null
          entry_at: string | null
        }
        Insert: {
          id?: number
          project_id?: number | null
          lead_id?: number | null
          file_path?: string | null
          description?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number | null
          lead_id?: number | null
          file_path?: string | null
          description?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_documents_entry_by_fkey"; columns: ["entry_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_documents_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "project_documents_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      project_forum_chats: {
        Row: {
          id: number
          project_id: number
          user_id: string | null
          message: string
          created_at: string
        }
        Insert: {
          id?: number
          project_id: number
          user_id?: string | null
          message: string
          created_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          user_id?: string | null
          message?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "project_forum_chats_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "project_forum_chats_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      project_meetings: {
        Row: {
          id: number
          project_id: number
          members: string[]
          agenda: string | null
          meeting_at: string | null
          conclusion: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          project_id: number
          members?: string[]
          agenda?: string | null
          meeting_at?: string | null
          conclusion?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number
          members?: string[]
          agenda?: string | null
          meeting_at?: string | null
          conclusion?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_meetings_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_meetings_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      project_milestones: {
        Row: {
          id: number
          project_id: number
          milestone: string
          percentage: number
          start_date: string | null
          end_date: string | null
          complete: boolean
          owner_id: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string | null
          updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          project_id: number
          milestone: string
          percentage: number
          start_date?: string | null
          end_date?: string | null
          complete?: boolean
          owner_id?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number
          milestone?: string
          percentage?: number
          start_date?: string | null
          end_date?: string | null
          complete?: boolean
          owner_id?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_milestones_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_milestones_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_milestones_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "project_milestones_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      project_proposals: {
        Row: {
          id: number
          project_id: number
          file_path: string
          description: string | null
          entry_by: string | null
          entry_at: string | null
        }
        Insert: {
          id?: number
          project_id: number
          file_path: string
          description?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number
          file_path?: string
          description?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_proposals_entry_by_fkey"; columns: ["entry_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_proposals_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      project_team: {
        Row: {
          id: number
          project_id: number
          member_type: string
          member_id: string | null
          member_name: string | null
          num_hours: number | null
          start_date: string | null
          end_date: string | null
          entry_by: string | null
          entry_at: string | null
        }
        Insert: {
          id?: number
          project_id: number
          member_type: string
          member_id?: string | null
          member_name?: string | null
          num_hours?: number | null
          start_date?: string | null
          end_date?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number
          member_type?: string
          member_id?: string | null
          member_name?: string | null
          num_hours?: number | null
          start_date?: string | null
          end_date?: string | null
          entry_by?: string | null
          entry_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "project_team_entry_by_fkey"; columns: ["entry_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_team_member_id_fkey"; columns: ["member_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "project_team_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      projects: {
        Row: {
          id: number
          name: string | null
          client_id: number | null
          leader_id: string | null
          description: string | null
          start_date: string | null
          end_date: string | null
          status: string
          percent_complete: number
          num_hours: number | null
          actual_end_at: string | null
          closed_by: string | null
          closing_reason: string | null
          rating: string | null
          final_report: boolean
          final_payment: boolean
          additional_work_required: string | null
          department_id: number | null
          sub_department_id: number | null
          project_type: string | null
          recurring: boolean
          approved_by: string | null
          approved_at: string | null
          rejected_by: string | null
          rejected_at: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name?: string | null
          client_id?: number | null
          leader_id?: string | null
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          percent_complete?: number
          num_hours?: number | null
          actual_end_at?: string | null
          closed_by?: string | null
          closing_reason?: string | null
          rating?: string | null
          final_report?: boolean
          final_payment?: boolean
          additional_work_required?: string | null
          department_id?: number | null
          sub_department_id?: number | null
          project_type?: string | null
          recurring?: boolean
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string | null
          client_id?: number | null
          leader_id?: string | null
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          percent_complete?: number
          num_hours?: number | null
          actual_end_at?: string | null
          closed_by?: string | null
          closing_reason?: string | null
          rating?: string | null
          final_report?: boolean
          final_payment?: boolean
          additional_work_required?: string | null
          department_id?: number | null
          sub_department_id?: number | null
          project_type?: string | null
          recurring?: boolean
          approved_by?: string | null
          approved_at?: string | null
          rejected_by?: string | null
          rejected_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "projects_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_closed_by_fkey"; columns: ["closed_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_department_id_fkey"; columns: ["department_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_leader_id_fkey"; columns: ["leader_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_rejected_by_fkey"; columns: ["rejected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "projects_sub_department_id_fkey"; columns: ["sub_department_id"]; isOneToOne: false; referencedRelation: "sub_departments"; referencedColumns: ["id"] }
        ]
      }
      purchase_requests: {
        Row: {
          id: number
          item: string
          category: string | null
          current_stock: number
          created_at: string | null
        }
        Insert: {
          id?: number
          item: string
          category?: string | null
          current_stock?: number
          created_at?: string | null
        }
        Update: {
          id?: number
          item?: string
          category?: string | null
          current_stock?: number
          created_at?: string | null
        }
        Relationships: [
        ]
      }
      reimbursement_rates: {
        Row: {
          id: number
          type: string
          price: number
          active: boolean
        }
        Insert: {
          id?: number
          type: string
          price: number
          active?: boolean
        }
        Update: {
          id?: number
          type?: string
          price?: number
          active?: boolean
        }
        Relationships: [
        ]
      }
      reimbursements: {
        Row: {
          id: number
          project_id: number | null
          profile_id: string
          period_from: string | null
          period_to: string | null
          distance: number | null
          price: number | null
          sub_amount: number | null
          amount: number
          description: string | null
          non_chargeable_category: string | null
          status: string
          added_by: string | null
          added_at: string | null
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: number
          project_id?: number | null
          profile_id: string
          period_from?: string | null
          period_to?: string | null
          distance?: number | null
          price?: number | null
          sub_amount?: number | null
          amount: number
          description?: string | null
          non_chargeable_category?: string | null
          status?: string
          added_by?: string | null
          added_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number | null
          profile_id?: string
          period_from?: string | null
          period_to?: string | null
          distance?: number | null
          price?: number | null
          sub_amount?: number | null
          amount?: number
          description?: string | null
          non_chargeable_category?: string | null
          status?: string
          added_by?: string | null
          added_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "reimbursements_added_by_fkey"; columns: ["added_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "reimbursements_approved_by_fkey"; columns: ["approved_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "reimbursements_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "reimbursements_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      sac_codes: {
        Row: {
          id: number
          sac: string
          description: string
          active: boolean
        }
        Insert: {
          id?: number
          sac: string
          description: string
          active?: boolean
        }
        Update: {
          id?: number
          sac?: string
          description?: string
          active?: boolean
        }
        Relationships: [
        ]
      }
      salary_entries: {
        Row: {
          id: number
          profile_id: string
          pay_type: string
          pay_date: string | null
          designation: string | null
          bank_branch: string | null
          amount: number
          description: string | null
          entered_on: string | null
          entered_by: string | null
        }
        Insert: {
          id?: number
          profile_id: string
          pay_type: string
          pay_date?: string | null
          designation?: string | null
          bank_branch?: string | null
          amount?: number
          description?: string | null
          entered_on?: string | null
          entered_by?: string | null
        }
        Update: {
          id?: number
          profile_id?: string
          pay_type?: string
          pay_date?: string | null
          designation?: string | null
          bank_branch?: string | null
          amount?: number
          description?: string | null
          entered_on?: string | null
          entered_by?: string | null
        }
        Relationships: [
          { foreignKeyName: "salary_entries_entered_by_fkey"; columns: ["entered_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "salary_entries_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      stock_consumption: {
        Row: {
          id: number
          item: string
          category: string | null
          quantity: number
          buffer: number
          consumed_at: string | null
        }
        Insert: {
          id?: number
          item: string
          category?: string | null
          quantity: number
          buffer?: number
          consumed_at?: string | null
        }
        Update: {
          id?: number
          item?: string
          category?: string | null
          quantity?: number
          buffer?: number
          consumed_at?: string | null
        }
        Relationships: [
        ]
      }
      stock_items: {
        Row: {
          id: number
          item: string
          description: string | null
          category: string | null
          quantity: number
          price: number | null
          purchase_date: string | null
          buffer: number
          added_by: string | null
          added_at: string | null
        }
        Insert: {
          id?: number
          item: string
          description?: string | null
          category?: string | null
          quantity?: number
          price?: number | null
          purchase_date?: string | null
          buffer?: number
          added_by?: string | null
          added_at?: string | null
        }
        Update: {
          id?: number
          item?: string
          description?: string | null
          category?: string | null
          quantity?: number
          price?: number | null
          purchase_date?: string | null
          buffer?: number
          added_by?: string | null
          added_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "stock_items_added_by_fkey"; columns: ["added_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      sub_departments: {
        Row: {
          id: number
          department_id: number
          name: string
          active: boolean
        }
        Insert: {
          id?: number
          department_id: number
          name: string
          active?: boolean
        }
        Update: {
          id?: number
          department_id?: number
          name?: string
          active?: boolean
        }
        Relationships: [
          { foreignKeyName: "sub_departments_department_id_fkey"; columns: ["department_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] }
        ]
      }
      suggestions: {
        Row: {
          id: number
          profile_id: string
          body: string
          created_at: string
          remarks: string
          replied_by: string | null
        }
        Insert: {
          id?: number
          profile_id: string
          body: string
          created_at?: string
          remarks?: string
          replied_by?: string | null
        }
        Update: {
          id?: number
          profile_id?: string
          body?: string
          created_at?: string
          remarks?: string
          replied_by?: string | null
        }
        Relationships: [
          { foreignKeyName: "suggestions_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "suggestions_replied_by_fkey"; columns: ["replied_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      task_comments: {
        Row: {
          id: number
          task_id: number
          user_id: string | null
          comment: string
          created_at: string | null
          mentions: string[]
        }
        Insert: {
          id?: number
          task_id: number
          user_id?: string | null
          comment: string
          created_at?: string | null
          mentions?: string[]
        }
        Update: {
          id?: number
          task_id?: number
          user_id?: string | null
          comment?: string
          created_at?: string | null
          mentions?: string[]
        }
        Relationships: [
          { foreignKeyName: "task_comments_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] },
          { foreignKeyName: "task_comments_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      task_participants: {
        Row: {
          task_id: number
          profile_id: string
          is_responsible: boolean
        }
        Insert: {
          task_id: number
          profile_id: string
          is_responsible?: boolean
        }
        Update: {
          task_id?: number
          profile_id?: string
          is_responsible?: boolean
        }
        Relationships: [
          { foreignKeyName: "task_participants_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "task_participants_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] }
        ]
      }
      tasks: {
        Row: {
          id: number
          project_id: number | null
          title: string
          description: string | null
          starts_on: string | null
          ends_on: string | null
          status: string
          created_by: string | null
          created_at: string | null
          completed_at: string | null
          edited_by: string | null
          edited_at: string | null
        }
        Insert: {
          id?: number
          project_id?: number | null
          title: string
          description?: string | null
          starts_on?: string | null
          ends_on?: string | null
          status?: string
          created_by?: string | null
          created_at?: string | null
          completed_at?: string | null
          edited_by?: string | null
          edited_at?: string | null
        }
        Update: {
          id?: number
          project_id?: number | null
          title?: string
          description?: string | null
          starts_on?: string | null
          ends_on?: string | null
          status?: string
          created_by?: string | null
          created_at?: string | null
          completed_at?: string | null
          edited_by?: string | null
          edited_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "tasks_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_edited_by_fkey"; columns: ["edited_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      time_entries: {
        Row: {
          id: number
          profile_id: string
          entry_date: string
          project_id: number | null
          client_name: string | null
          project_ref: string | null
          work_accomplished: string | null
          minutes: number
          non_chargeable_category: string | null
          remarks: string
          submitted_at: string | null
        }
        Insert: {
          id?: number
          profile_id: string
          entry_date: string
          project_id?: number | null
          client_name?: string | null
          project_ref?: string | null
          work_accomplished?: string | null
          minutes: number
          non_chargeable_category?: string | null
          remarks?: string
          submitted_at?: string | null
        }
        Update: {
          id?: number
          profile_id?: string
          entry_date?: string
          project_id?: number | null
          client_name?: string | null
          project_ref?: string | null
          work_accomplished?: string | null
          minutes?: number
          non_chargeable_category?: string | null
          remarks?: string
          submitted_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "time_entries_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "time_entries_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] }
        ]
      }
      time_entry_edits: {
        Row: {
          id: number
          time_entry_id: number | null
          profile_id: string
          entry_date: string | null
          client_name: string | null
          project_ref: string | null
          work_accomplished: string | null
          minutes: number | null
          project_id: number | null
          non_chargeable_category: string | null
          remarks: string | null
          submitted_at: string | null
        }
        Insert: {
          id?: number
          time_entry_id?: number | null
          profile_id: string
          entry_date?: string | null
          client_name?: string | null
          project_ref?: string | null
          work_accomplished?: string | null
          minutes?: number | null
          project_id?: number | null
          non_chargeable_category?: string | null
          remarks?: string | null
          submitted_at?: string | null
        }
        Update: {
          id?: number
          time_entry_id?: number | null
          profile_id?: string
          entry_date?: string | null
          client_name?: string | null
          project_ref?: string | null
          work_accomplished?: string | null
          minutes?: number | null
          project_id?: number | null
          non_chargeable_category?: string | null
          remarks?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          { foreignKeyName: "time_entry_edits_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "time_entry_edits_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "time_entry_edits_time_entry_id_fkey"; columns: ["time_entry_id"]; isOneToOne: false; referencedRelation: "time_entries"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      request_time_edit: { Args: { p_entry_id: number; p_date: string; p_project_id: number; p_category: string; p_work: string; p_minutes: number }; Returns: number }
      approve_time_edit: { Args: { p_edit_id: number }; Returns: undefined }
      approve_all_time_edits: { Args: Record<string, never>; Returns: number }
      reject_time_edit: { Args: { p_edit_id: number }; Returns: undefined }
      suggested_salary: { Args: { p_profile: string; p_year: number; p_month: number }; Returns: number | null }
      add_salary: { Args: { p_profile: string; p_pay_date: string; p_amount: number; p_pay_type: string; p_description: string }; Returns: number }
      report_project_efficiency: { Args: { p_project: number }; Returns: { profile_id: string; name: string | null; grade: string | null; est_hours: number; actual_minutes: number; rate: number }[] }
      report_employee_efficiency: { Args: { p_profile: string; p_from: string; p_to: string }; Returns: { project_id: number; project_name: string | null; client_name: string | null; est_hours: number; actual_minutes: number }[] }
      report_employee_nonchargeable: { Args: { p_profile: string; p_from: string; p_to: string }; Returns: { category: string; minutes: number }[] }
      report_profitability: { Args: { p_project?: number | null; p_from?: string | null; p_to?: string | null }; Returns: { project_id: number; project_name: string | null; client_name: string | null; status: string; quoted: number; invoiced: number; collected: number; minutes: number; unrated_minutes: number; labour_cost: number; reimbursements: number; overhead_rate: number; planned_hours: number; planned_cost: number }[] }
      log_ai_usage: { Args: { p_feature: string; p_input: number; p_output: number }; Returns: undefined }
      ai_usage_summary: { Args: Record<string, never>; Returns: { total_tokens: number; my_tokens: number }[] }
      report_project_risks: { Args: Record<string, never>; Returns: { project_id: number; project_name: string | null; client_name: string | null; end_date: string | null; status: string; planned_hours: number; logged_minutes: number; progress_pct: number; milestones_open: number; milestones_overdue: number; tasks_open: number; tasks_overdue: number; last_time_entry: string | null; top_overdue_person: string | null; top_overdue_count: number }[] }
      mark_notification_read: { Args: { p_id: number }; Returns: undefined }
      mark_all_notifications_read: { Args: Record<string, never>; Returns: undefined }
      set_email_notifications: { Args: { p_on: boolean }; Returns: undefined }
      generate_due_notifications: { Args: Record<string, never>; Returns: number }
      submit_review: { Args: { p_profile: string; p_project: number; p_followup: number; p_ownership: number; p_accuracy: number; p_enthusiasm: number; p_detail: number; p_comments: string }; Returns: number }
      set_score_weights: { Args: { p_weights: Json }; Returns: undefined }
      employee_scorecard: { Args: { p_profile: string; p_from: string; p_to: string; p_full_day_minutes?: number }; Returns: { tasks_due: number; tasks_on_time: number; milestones_due: number; milestones_on_time: number; working_days: number; attendance_rows: number; present_days: number; logged_days: number; assigned_minutes: number; unassigned_minutes: number; nonchargeable_minutes: number; idle_projects: number; review_count: number; review_avg: number | null }[] }
      employee_overdue: { Args: { p_profile: string }; Returns: { kind: string; title: string; project_name: string | null; due: string; ref_id: number }[] }
      create_appraisal_cycle: { Args: { p_name: string; p_from: string; p_to: string }; Returns: number }
      close_appraisal_cycle: { Args: { p_cycle: number; p_results: Json }; Returns: number }
      rate_appraisal_result: { Args: { p_result: number; p_rating: number; p_remark: string }; Returns: undefined }
      publish_appraisal_cycle: { Args: { p_cycle: number }; Returns: undefined }
      acknowledge_appraisal: { Args: { p_result: number; p_comment: string }; Returns: undefined }
      create_invoice: { Args: { p_header: Json; p_lines: Json }; Returns: number }
      update_invoice: { Args: { p_id: number; p_header: Json; p_lines: Json }; Returns: undefined }
      convert_to_tax_invoice: { Args: { p_id: number }; Returns: number }
      confirm_invoice_payment: { Args: { p_id: number }; Returns: undefined }
      delete_invoice: { Args: { p_id: number }; Returns: undefined }
      next_invoice_number: { Args: { p_entity: string; p_series: string }; Returns: number }
      approve_lead: { Args: { p_lead_id: number; p_name: string; p_department_id: number; p_project_type: string }; Returns: number }
      reject_lead: { Args: { p_lead_id: number; p_reason: string }; Returns: undefined }
      add_stock: { Args: { p_item: string; p_category: string; p_description: string; p_qty: number; p_price: number; p_purchase_date: string; p_buffer: number }; Returns: number }
      consume_stock: { Args: { p_item_id: number; p_qty: number }; Returns: number }
      decide_project: { Args: { p_project_id: number; p_approve: boolean }; Returns: undefined }
      complete_milestone: { Args: { p_milestone_id: number; p_reason: string }; Returns: number }
      close_project: { Args: { p_project_id: number; p_reason: string }; Returns: undefined }
      can_manage_project: { Args: { pid: number }; Returns: boolean }
      can_edit_task: { Args: { tid: number }; Returns: boolean }
      calendar_leaves: { Args: { p_from: string; p_to: string }; Returns: { name: string; leave_type: string; leave_from: string; leave_to: string }[] }
      calendar_birthdays: { Args: Record<string, never>; Returns: { name: string; month: number; day: number }[] }
    }
    Enums: {
      user_role: "admin" | "bd" | "teamlead" | "teamlead2" | "employee"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
