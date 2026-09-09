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
      api_clients: {
        Row: {
          allowed_origins: string[]
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix?: string
          last_used_at?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_request_log: {
        Row: {
          api_client_id: string | null
          created_at: string
          id: string
          ip: string
          path: string
        }
        Insert: {
          api_client_id?: string | null
          created_at?: string
          id?: string
          ip?: string
          path: string
        }
        Update: {
          api_client_id?: string | null
          created_at?: string
          id?: string
          ip?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_secrets: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_notifications: {
        Row: {
          booking_id: string
          created_at: string
          error: string
          id: string
          kind: string
          recipient: string
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          error?: string
          id?: string
          kind: string
          recipient?: string
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          error?: string
          id?: string
          kind?: string
          recipient?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults_count: number
          bic: string | null
          birth_date: string | null
          booking_number: string
          check_in_time: string
          check_out_time: string
          children_count: number
          client_type: string
          company_code: string
          company_name: string
          created_at: string
          customer_address: string
          customer_country: string
          customer_email: string
          customer_id_code: string
          customer_name: string
          customer_phone: string
          date_from: string
          date_to: string
          expires_at: string | null
          external_source: string | null
          external_uid: string | null
          extras: Json
          extras_total: number
          guests: number
          id: string
          infants_count: number
          is_vat_payer: boolean
          language: string | null
          location: string
          mileage_in: number | null
          mileage_out: number | null
          note: string | null
          payment_amount: number
          payment_option: string
          payment_paid_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          pickup_location: string
          pickup_time: string
          property_id: string
          return_location: string
          return_time: string
          source: string
          status: string
          total_amount: number
          total_guests: number
          updated_at: string
          vat_number: string
        }
        Insert: {
          adults_count?: number
          bic?: string | null
          birth_date?: string | null
          booking_number: string
          check_in_time?: string
          check_out_time?: string
          children_count?: number
          client_type?: string
          company_code?: string
          company_name?: string
          created_at?: string
          customer_address?: string
          customer_country?: string
          customer_email?: string
          customer_id_code?: string
          customer_name?: string
          customer_phone?: string
          date_from: string
          date_to: string
          expires_at?: string | null
          external_source?: string | null
          external_uid?: string | null
          extras?: Json
          extras_total?: number
          guests?: number
          id?: string
          infants_count?: number
          is_vat_payer?: boolean
          language?: string | null
          location?: string
          mileage_in?: number | null
          mileage_out?: number | null
          note?: string | null
          payment_amount?: number
          payment_option?: string
          payment_paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          pickup_location?: string
          pickup_time?: string
          property_id: string
          return_location?: string
          return_time?: string
          source?: string
          status?: string
          total_amount?: number
          total_guests?: number
          updated_at?: string
          vat_number?: string
        }
        Update: {
          adults_count?: number
          bic?: string | null
          birth_date?: string | null
          booking_number?: string
          check_in_time?: string
          check_out_time?: string
          children_count?: number
          client_type?: string
          company_code?: string
          company_name?: string
          created_at?: string
          customer_address?: string
          customer_country?: string
          customer_email?: string
          customer_id_code?: string
          customer_name?: string
          customer_phone?: string
          date_from?: string
          date_to?: string
          expires_at?: string | null
          external_source?: string | null
          external_uid?: string | null
          extras?: Json
          extras_total?: number
          guests?: number
          id?: string
          infants_count?: number
          is_vat_payer?: boolean
          language?: string | null
          location?: string
          mileage_in?: number | null
          mileage_out?: number | null
          note?: string | null
          payment_amount?: number
          payment_option?: string
          payment_paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          pickup_location?: string
          pickup_time?: string
          property_id?: string
          return_location?: string
          return_time?: string
          source?: string
          status?: string
          total_amount?: number
          total_guests?: number
          updated_at?: string
          vat_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          lat: number | null
          lng: number | null
          name: string
          notes: string
          postal_code: string
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string
          postal_code?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string
          postal_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      car_investments: {
        Row: {
          amount: number
          car_id: string
          category: string
          created_at: string
          id: string
          mileage_km: number | null
          note: string
          purchase_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          car_id: string
          category?: string
          created_at?: string
          id?: string
          mileage_km?: number | null
          note?: string
          purchase_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          car_id?: string
          category?: string
          created_at?: string
          id?: string
          mileage_km?: number | null
          note?: string
          purchase_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_investments_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_maintenance: {
        Row: {
          car_id: string
          created_at: string
          due_date: string | null
          due_mileage_km: number | null
          id: string
          last_done_at: string | null
          note: string
          type: string
          updated_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_done_at?: string | null
          note?: string
          type: string
          updated_at?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_done_at?: string | null
          note?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_maintenance_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          category: string
          consumption: string
          cover_image_url: string
          created_at: string
          features: Json
          fuel: string
          id: string
          image_urls: Json
          is_active: boolean
          mileage_policy: string
          name: string
          price_per_day: number
          price_tiers: Json
          seats: number
          sort_order: number
          transmission: string
          updated_at: string
          year: number
        }
        Insert: {
          category: string
          consumption?: string
          cover_image_url?: string
          created_at?: string
          features?: Json
          fuel: string
          id?: string
          image_urls?: Json
          is_active?: boolean
          mileage_policy?: string
          name: string
          price_per_day: number
          price_tiers?: Json
          seats?: number
          sort_order?: number
          transmission: string
          updated_at?: string
          year: number
        }
        Update: {
          category?: string
          consumption?: string
          cover_image_url?: string
          created_at?: string
          features?: Json
          fuel?: string
          id?: string
          image_urls?: Json
          is_active?: boolean
          mileage_policy?: string
          name?: string
          price_per_day?: number
          price_tiers?: Json
          seats?: number
          sort_order?: number
          transmission?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      charges: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          kind: string
          lease_id: string
          meter_reading_id: string | null
          period: string
          quantity: number
          unit_price: number
          updated_at: string
          utility_rate_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          kind: string
          lease_id: string
          meter_reading_id?: string | null
          period: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          utility_rate_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          kind?: string
          lease_id?: string
          meter_reading_id?: string | null
          period?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          utility_rate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
          {
            foreignKeyName: "charges_meter_reading_id_fkey"
            columns: ["meter_reading_id"]
            isOneToOne: false
            referencedRelation: "meter_readings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_utility_rate_id_fkey"
            columns: ["utility_rate_id"]
            isOneToOne: false
            referencedRelation: "utility_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          fields: Json
          id: string
          is_enabled: boolean
          subject: string
          template_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          content?: string
          created_at?: string
          fields?: Json
          id?: string
          is_enabled?: boolean
          subject?: string
          template_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          fields?: Json
          id?: string
          is_enabled?: boolean
          subject?: string
          template_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          entity_id: string
          entity_type: string
          field: string
          id: string
          lang: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          field: string
          id?: string
          lang: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          lang?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          language: string
          name: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          language: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          language?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      developer_invite_approvals: {
        Row: {
          approver_id: string
          created_at: string
          id: string
          invite_id: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          id?: string
          invite_id: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          id?: string
          invite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "developer_invite_approvals_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "developer_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          proposed_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string
          id?: string
          proposed_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          proposed_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          bucket: string
          created_at: string
          expires_at: string | null
          file_path: string
          id: string
          kind: string
          lease_id: string | null
          mime_type: string
          size_bytes: number
          tenant_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          expires_at?: string | null
          file_path: string
          id?: string
          kind?: string
          lease_id?: string | null
          mime_type?: string
          size_bytes?: number
          tenant_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          kind?: string
          lease_id?: string | null
          mime_type?: string
          size_bytes?: number
          tenant_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_lease_fk"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lease_fk"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
          {
            foreignKeyName: "documents_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          note: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          note?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          note?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_comments: {
        Row: {
          author_id: string | null
          author_role: string
          body: string
          created_at: string
          id: string
          property_id: string
          service_date: string
        }
        Insert: {
          author_id?: string | null
          author_role: string
          body: string
          created_at?: string
          id?: string
          property_id: string
          service_date: string
        }
        Update: {
          author_id?: string | null
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          property_id?: string
          service_date?: string
        }
        Relationships: []
      }
      housekeeping_tasks: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          id: string
          property_id: string
          service_date: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          property_id: string
          service_date: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          property_id?: string
          service_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          buyer: Json
          created_at: string
          currency: string
          full_number: string
          id: string
          invoice_number: number
          invoice_series: string
          is_vat_invoice: boolean
          issue_date: string
          issued_by: string
          lease_id: string | null
          line_items: Json
          notes: string
          seller: Json
          subtotal_net: number
          total: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          buyer: Json
          created_at?: string
          currency?: string
          full_number: string
          id?: string
          invoice_number: number
          invoice_series?: string
          is_vat_invoice?: boolean
          issue_date?: string
          issued_by?: string
          lease_id?: string | null
          line_items: Json
          notes?: string
          seller: Json
          subtotal_net?: number
          total?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          buyer?: Json
          created_at?: string
          currency?: string
          full_number?: string
          id?: string
          invoice_number?: number
          invoice_series?: string
          is_vat_invoice?: boolean
          issue_date?: string
          issued_by?: string
          lease_id?: string | null
          line_items?: Json
          notes?: string
          seller?: Json
          subtotal_net?: number
          total?: number
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
        ]
      }
      issue_comments: {
        Row: {
          author_id: string | null
          author_role: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          issue_id: string
          photo_paths: Json
        }
        Insert: {
          author_id?: string | null
          author_role?: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          issue_id: string
          photo_paths?: Json
        }
        Update: {
          author_id?: string | null
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          issue_id?: string
          photo_paths?: Json
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_to: string | null
          category: string
          cost: number | null
          created_at: string
          description: string
          id: string
          lease_id: string | null
          photo_paths: Json
          priority: string
          reported_by: string | null
          reporter_name: string
          resolved_at: string | null
          status: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          lease_id?: string | null
          photo_paths?: Json
          priority?: string
          reported_by?: string | null
          reporter_name?: string
          resolved_at?: string | null
          status?: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          lease_id?: string | null
          photo_paths?: Json
          priority?: string
          reported_by?: string | null
          reporter_name?: string
          resolved_at?: string | null
          status?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
          {
            foreignKeyName: "issues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "issues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_occupants: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          lease_id: string
          phone: string
          relation: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          lease_id: string
          phone?: string
          relation?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          lease_id?: string
          phone?: string
          relation?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_occupants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_occupants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
          {
            foreignKeyName: "lease_occupants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          created_at: string
          deposit: number
          deposit_paid: number
          end_date: string | null
          id: string
          monthly_rent: number
          notes: string
          notice_days: number
          payment_day: number
          renewal: boolean
          start_date: string
          status: string
          tenant_id: string
          terminated_at: string | null
          termination_reason: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit?: number
          deposit_paid?: number
          end_date?: string | null
          id?: string
          monthly_rent?: number
          notes?: string
          notice_days?: number
          payment_day?: number
          renewal?: boolean
          start_date: string
          status?: string
          tenant_id: string
          terminated_at?: string | null
          termination_reason?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit?: number
          deposit_paid?: number
          end_date?: string | null
          id?: string
          monthly_rent?: number
          notes?: string
          notice_days?: number
          payment_day?: number
          renewal?: boolean
          start_date?: string
          status?: string
          tenant_id?: string
          terminated_at?: string | null
          termination_reason?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_readings: {
        Row: {
          consumption: number
          created_at: string
          id: string
          meter_id: string
          needs_review: boolean
          note: string
          period: string
          photo_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          superseded_by: string | null
          updated_at: string
          value: number
        }
        Insert: {
          consumption?: number
          created_at?: string
          id?: string
          meter_id: string
          needs_review?: boolean
          note?: string
          period: string
          photo_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          superseded_by?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          consumption?: number
          created_at?: string
          id?: string
          meter_id?: string
          needs_review?: boolean
          note?: string
          period?: string
          photo_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          superseded_by?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "meter_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      meters: {
        Row: {
          building_id: string | null
          created_at: string
          digits: number | null
          id: string
          initial_reading: number
          is_active: boolean
          notes: string
          serial_number: string
          type: string
          unit_id: string | null
          uom: string
          updated_at: string
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          digits?: number | null
          id?: string
          initial_reading?: number
          is_active?: boolean
          notes?: string
          serial_number?: string
          type: string
          unit_id?: string | null
          uom?: string
          updated_at?: string
        }
        Update: {
          building_id?: string | null
          created_at?: string
          digits?: number | null
          id?: string
          initial_reading?: number
          is_active?: boolean
          notes?: string
          serial_number?: string
          type?: string
          unit_id?: string | null
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meters_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "meters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          address: string | null
          bank_name: string | null
          brand_email_logo_url: string | null
          brand_logo_url: string | null
          brand_pdf_logo_url: string | null
          brand_primary_color: string
          brand_secondary_color: string
          city: string | null
          company_address: string | null
          company_code: string | null
          company_name: string | null
          company_vat_code: string | null
          country: string
          created_at: string
          currency: string
          default_language: string
          default_notice_days: number
          display_name: string | null
          email: string | null
          iban: string | null
          id: string
          integrations: Json
          invoice_issuer_name: string
          invoice_logo_url: string | null
          invoice_next_number: number
          invoice_notes: string | null
          invoice_series: string | null
          lat: number | null
          lng: number | null
          notify_issue_update: boolean
          notify_lease_expiring: boolean
          notify_new_inquiry: boolean
          notify_payment_overdue: boolean
          notify_reading_reminder: boolean
          payment_due_day: number
          payment_methods: Json
          phone: string | null
          postal_code: string | null
          reading_window_from_day: number
          reading_window_to_day: number
          require_meter_photo: boolean
          singleton: boolean
          tagline: string
          timezone: string
          updated_at: string
          updated_by: string | null
          vat_rate: number
        }
        Insert: {
          address?: string | null
          bank_name?: string | null
          brand_email_logo_url?: string | null
          brand_logo_url?: string | null
          brand_pdf_logo_url?: string | null
          brand_primary_color?: string
          brand_secondary_color?: string
          city?: string | null
          company_address?: string | null
          company_code?: string | null
          company_name?: string | null
          company_vat_code?: string | null
          country?: string
          created_at?: string
          currency?: string
          default_language?: string
          default_notice_days?: number
          display_name?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          integrations?: Json
          invoice_issuer_name?: string
          invoice_logo_url?: string | null
          invoice_next_number?: number
          invoice_notes?: string | null
          invoice_series?: string | null
          lat?: number | null
          lng?: number | null
          notify_issue_update?: boolean
          notify_lease_expiring?: boolean
          notify_new_inquiry?: boolean
          notify_payment_overdue?: boolean
          notify_reading_reminder?: boolean
          payment_due_day?: number
          payment_methods?: Json
          phone?: string | null
          postal_code?: string | null
          reading_window_from_day?: number
          reading_window_to_day?: number
          require_meter_photo?: boolean
          singleton?: boolean
          tagline?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Update: {
          address?: string | null
          bank_name?: string | null
          brand_email_logo_url?: string | null
          brand_logo_url?: string | null
          brand_pdf_logo_url?: string | null
          brand_primary_color?: string
          brand_secondary_color?: string
          city?: string | null
          company_address?: string | null
          company_code?: string | null
          company_name?: string | null
          company_vat_code?: string | null
          country?: string
          created_at?: string
          currency?: string
          default_language?: string
          default_notice_days?: number
          display_name?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          integrations?: Json
          invoice_issuer_name?: string
          invoice_logo_url?: string | null
          invoice_next_number?: number
          invoice_notes?: string | null
          invoice_series?: string | null
          lat?: number | null
          lng?: number | null
          notify_issue_update?: boolean
          notify_lease_expiring?: boolean
          notify_new_inquiry?: boolean
          notify_payment_overdue?: boolean
          notify_reading_reminder?: boolean
          payment_due_day?: number
          payment_methods?: Json
          phone?: string | null
          postal_code?: string | null
          reading_window_from_day?: number
          reading_window_to_day?: number
          require_meter_photo?: boolean
          singleton?: boolean
          tagline?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country: string
          created_at: string
          id: string
          path: string
          referrer: string
          session_id: string
          user_agent: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          path?: string
          referrer?: string
          session_id?: string
          user_agent?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          path?: string
          referrer?: string
          session_id?: string
          user_agent?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          lease_id: string
          method: string
          note: string
          paid_at: string
          recorded_by: string | null
          reference: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          lease_id: string
          method?: string
          note?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lease_id?: string
          method?: string
          note?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
        ]
      }
      property_investments: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          note: string
          purchase_date: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string
          purchase_date?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string
          purchase_date?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_investments_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_investments_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "property_investments_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      property_maintenance: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          last_done_at: string | null
          note: string
          type: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          last_done_at?: string | null
          note?: string
          type: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          last_done_at?: string | null
          note?: string
          type?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_maintenance_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_maintenance_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "property_maintenance_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_inquiries: {
        Row: {
          converted_lease_id: string | null
          created_at: string
          email: string
          handled_by: string | null
          id: string
          message: string
          move_in_date: string | null
          name: string
          phone: string
          source: string
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          converted_lease_id?: string | null
          created_at?: string
          email?: string
          handled_by?: string | null
          id?: string
          message?: string
          move_in_date?: string | null
          name: string
          phone?: string
          source?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          converted_lease_id?: string | null
          created_at?: string
          email?: string
          handled_by?: string | null
          id?: string
          message?: string
          move_in_date?: string | null
          name?: string
          phone?: string
          source?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_inquiries_converted_lease_id_fkey"
            columns: ["converted_lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_inquiries_converted_lease_id_fkey"
            columns: ["converted_lease_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["holding_lease_id"]
          },
          {
            foreignKeyName: "rental_inquiries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_inquiries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "rental_inquiries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      room_status: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          has_issue: boolean
          id: string
          issue_note: string
          note: string
          property_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          has_issue?: boolean
          id?: string
          issue_note?: string
          note?: string
          property_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          has_issue?: boolean
          id?: string
          issue_note?: string
          note?: string
          property_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_status_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_status_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "room_status_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_identity: {
        Row: {
          created_at: string
          id: string
          id_doc_number: string
          id_doc_type: string
          issued_by: string
          personal_code: string
          tenant_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_doc_number?: string
          id_doc_type?: string
          issued_by?: string
          personal_code?: string
          tenant_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          id_doc_number?: string
          id_doc_type?: string
          issued_by?: string
          personal_code?: string
          tenant_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_identity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          notes: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      unit_events: {
        Row: {
          cost: number | null
          created_at: string
          ended_at: string | null
          id: string
          kind: string
          note: string
          started_at: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          note?: string
          started_at?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          note?: string
          started_at?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "public_vacancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_availability"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string
          amenities: Json
          area_m2: number | null
          building_id: string | null
          city: string
          country: string
          cover_image_url: string
          created_at: string
          deposit: number
          description: string
          features: Json
          floor: number | null
          id: string
          image_urls: Json
          is_active: boolean
          is_listed: boolean
          lat: number | null
          lng: number | null
          location_note: string
          monthly_rent: number
          name: string
          notes: string
          room_count: number
          sort_order: number
          status: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          address?: string
          amenities?: Json
          area_m2?: number | null
          building_id?: string | null
          city?: string
          country?: string
          cover_image_url?: string
          created_at?: string
          deposit?: number
          description?: string
          features?: Json
          floor?: number | null
          id?: string
          image_urls?: Json
          is_active?: boolean
          is_listed?: boolean
          lat?: number | null
          lng?: number | null
          location_note?: string
          monthly_rent?: number
          name: string
          notes?: string
          room_count?: number
          sort_order?: number
          status?: string
          unit_number?: string
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: Json
          area_m2?: number | null
          building_id?: string | null
          city?: string
          country?: string
          cover_image_url?: string
          created_at?: string
          deposit?: number
          description?: string
          features?: Json
          floor?: number | null
          id?: string
          image_urls?: Json
          is_active?: boolean
          is_listed?: boolean
          lat?: number | null
          lng?: number | null
          location_note?: string
          monthly_rent?: number
          name?: string
          notes?: string
          room_count?: number
          sort_order?: number
          status?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utility_rates: {
        Row: {
          created_at: string
          effective_from: string
          fixed_monthly: number
          id: string
          note: string
          price_per_unit: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          fixed_monthly?: number
          id?: string
          note?: string
          price_per_unit?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          fixed_monthly?: number
          id?: string
          note?: string
          price_per_unit?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_vacancies: {
        Row: {
          address: string | null
          amenities: Json | null
          area_m2: number | null
          available_from: string | null
          building_name: string | null
          city: string | null
          cover_image_url: string | null
          deposit: number | null
          description: string | null
          floor: number | null
          id: string | null
          image_urls: Json | null
          monthly_rent: number | null
          name: string | null
          room_count: number | null
          unit_number: string | null
          vacant_now: boolean | null
        }
        Relationships: []
      }
      unit_availability: {
        Row: {
          available_from: string | null
          has_future_lease: boolean | null
          holding_end_date: string | null
          holding_lease_id: string | null
          holding_monthly_rent: number | null
          holding_renewal: boolean | null
          holding_start_date: string | null
          holding_tenant_id: string | null
          is_active: boolean | null
          is_listed: boolean | null
          status: string | null
          unit_id: string | null
          vacant_days: number | null
          vacant_since: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["holding_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analytics_summary: { Args: { _from: string; _to: string }; Returns: Json }
      cancel_expired_pending_bookings: { Args: never; Returns: number }
      claim_developer_invite: { Args: { _invite_id: string }; Returns: boolean }
      claim_invoice_number: {
        Args: never
        Returns: {
          number: number
          series: string
        }[]
      }
      convert_inquiry_to_lease: {
        Args: {
          _deposit: number
          _email?: string
          _end_date?: string
          _first_name?: string
          _inquiry_id: string
          _last_name?: string
          _monthly_rent: number
          _notes?: string
          _notice_days: number
          _payment_day: number
          _phone?: string
          _start_date: string
          _tenant_id?: string
          _unit_id: string
        }
        Returns: {
          lease_id: string
          tenant_id: string
        }[]
      }
      current_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_developer: { Args: { _user_id?: string }; Returns: boolean }
      is_manager: { Args: { _user_id?: string }; Returns: boolean }
      is_owner: { Args: { _user_id?: string }; Returns: boolean }
      is_tenant: { Args: { _user_id?: string }; Returns: boolean }
      issue_invoice_for_charges: {
        Args: {
          _buyer: Json
          _charge_ids: string[]
          _currency: string
          _is_vat_invoice: boolean
          _issue_date: string
          _issued_by: string
          _line_items: Json
          _notes: string
          _seller: Json
          _subtotal_net: number
          _total: number
          _vat_amount: number
          _vat_rate: number
        }
        Returns: {
          full_number: string
          invoice_id: string
        }[]
      }
      round_money_products: { Args: { _items: Json }; Returns: number[] }
      tenant_owns_building: { Args: { _building_id: string }; Returns: boolean }
      tenant_owns_lease: { Args: { _lease_id: string }; Returns: boolean }
      tenant_owns_unit: { Args: { _unit_id: string }; Returns: boolean }
      unit_availability_calc: {
        Args: {
          _created_at: string
          _holding_end_date: string
          _holding_renewal: boolean
          _last_finished_end: string
          _status: string
        }
        Returns: {
          available_from: string
          vacant_days: number
          vacant_since: string
        }[]
      }
    }
    Enums: {
      app_role: "developer" | "owner" | "manager" | "tenant"
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
      app_role: ["developer", "owner", "manager", "tenant"],
    },
  },
} as const
