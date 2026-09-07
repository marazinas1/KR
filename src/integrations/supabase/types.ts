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
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          mileage_km: number | null
          note: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          booking_id: string
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
          line_items: Json
          notes: string
          seller: Json
          subtotal_net: number
          total: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          booking_id: string
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
          line_items: Json
          notes?: string
          seller: Json
          subtotal_net?: number
          total?: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          booking_id?: string
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
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      payment_transactions: {
        Row: {
          amount: number
          bic: string | null
          booking_id: string
          created_at: string
          currency: string
          id: string
          mac_valid: boolean | null
          provider: string
          provider_transaction_id: string | null
          raw_request: Json | null
          raw_response: Json | null
          service_code: string | null
          stamp: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bic?: string | null
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          mac_valid?: boolean | null
          provider?: string
          provider_transaction_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          service_code?: string | null
          stamp: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bic?: string | null
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          mac_valid?: boolean | null
          provider?: string
          provider_transaction_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          service_code?: string | null
          stamp?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: Json
          area_m2: number | null
          beds: number
          category: string
          city: string
          country: string
          cover_image_url: string
          created_at: string
          description: string
          door_code: string | null
          extra_services: Json
          features: Json
          ical_import_url: string | null
          ical_last_status: string | null
          ical_last_sync_at: string | null
          id: string
          image_urls: Json
          is_active: boolean
          lat: number | null
          lng: number | null
          location_note: string
          max_guests: number
          name: string
          price_per_night: number
          price_tiers: Json
          property_type: string
          rooms: Json
          sort_order: number
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          address?: string
          amenities?: Json
          area_m2?: number | null
          beds?: number
          category: string
          city?: string
          country?: string
          cover_image_url?: string
          created_at?: string
          description?: string
          door_code?: string | null
          extra_services?: Json
          features?: Json
          ical_import_url?: string | null
          ical_last_status?: string | null
          ical_last_sync_at?: string | null
          id?: string
          image_urls?: Json
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          location_note?: string
          max_guests?: number
          name: string
          price_per_night: number
          price_tiers?: Json
          property_type?: string
          rooms?: Json
          sort_order?: number
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          address?: string
          amenities?: Json
          area_m2?: number | null
          beds?: number
          category?: string
          city?: string
          country?: string
          cover_image_url?: string
          created_at?: string
          description?: string
          door_code?: string | null
          extra_services?: Json
          features?: Json
          ical_import_url?: string | null
          ical_last_status?: string | null
          ical_last_sync_at?: string | null
          id?: string
          image_urls?: Json
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          location_note?: string
          max_guests?: number
          name?: string
          price_per_night?: number
          price_tiers?: Json
          property_type?: string
          rooms?: Json
          sort_order?: number
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          created_at: string
          expires_at: string | null
          file_path: string
          id: string
          kind: string
          mime_type: string
          property_id: string
          size_bytes: number
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_path: string
          id?: string
          kind: string
          mime_type?: string
          property_id: string
          size_bytes?: number
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          kind?: string
          mime_type?: string
          property_id?: string
          size_bytes?: number
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_events: {
        Row: {
          cost: number | null
          created_at: string
          ended_at: string | null
          id: string
          mileage_km: number | null
          note: string
          property_id: string
          reason: string
          started_at: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          mileage_km?: number | null
          note?: string
          property_id: string
          reason?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string
          reason?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_investments: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          mileage_km: number | null
          note: string
          property_id: string
          purchase_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id: string
          purchase_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string
          purchase_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_investments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_maintenance: {
        Row: {
          created_at: string
          due_date: string | null
          due_mileage_km: number | null
          id: string
          last_done_at: string | null
          note: string
          property_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_done_at?: string | null
          note?: string
          property_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_done_at?: string | null
          note?: string
          property_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_maintenance_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_settings: {
        Row: {
          address: string | null
          auto_confirm_bookings: boolean
          auto_refund_deposit: boolean
          bank_name: string | null
          brand_email_logo_url: string | null
          brand_logo_url: string | null
          brand_pdf_logo_url: string | null
          brand_primary_color: string
          brand_secondary_color: string
          cancellation_fee: number
          cancellation_fee_type: string
          cancellation_policy_text: string | null
          checkin_from: string
          checkin_reminder_hours_before: number
          checkin_until: string
          checkout_until: string
          children_free_until_age: number
          city: string | null
          city_tax: number
          city_tax_min_age: number
          company_address: string | null
          company_code: string | null
          company_name: string | null
          company_vat_code: string | null
          country: string
          created_at: string
          currency: string
          default_language: string
          deposit_amount: number
          deposit_required: boolean
          deposit_type: string
          display_name: string | null
          email: string | null
          extra_guest_fee: number
          free_cancellation_days: number
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
          max_advance_days: number
          max_nights: number
          min_guest_age: number
          min_nights: number
          no_show_fee: number
          notify_booking_change: boolean
          notify_booking_confirmation: boolean
          notify_cancellation_confirmation: boolean
          notify_checkin_reminder: boolean
          notify_review_request: boolean
          parties_allowed: boolean
          payment_due_days: number
          payment_methods: Json
          pets_allowed: boolean
          phone: string | null
          postal_code: string | null
          property_id: string | null
          quiet_hours_from: string
          quiet_hours_to: string
          require_email: boolean
          require_phone: boolean
          review_link: string | null
          review_request_hours_after: number
          scope: string
          timezone: string
          updated_at: string
          updated_by: string | null
          vat_rate: number
        }
        Insert: {
          address?: string | null
          auto_confirm_bookings?: boolean
          auto_refund_deposit?: boolean
          bank_name?: string | null
          brand_email_logo_url?: string | null
          brand_logo_url?: string | null
          brand_pdf_logo_url?: string | null
          brand_primary_color?: string
          brand_secondary_color?: string
          cancellation_fee?: number
          cancellation_fee_type?: string
          cancellation_policy_text?: string | null
          checkin_from?: string
          checkin_reminder_hours_before?: number
          checkin_until?: string
          checkout_until?: string
          children_free_until_age?: number
          city?: string | null
          city_tax?: number
          city_tax_min_age?: number
          company_address?: string | null
          company_code?: string | null
          company_name?: string | null
          company_vat_code?: string | null
          country?: string
          created_at?: string
          currency?: string
          default_language?: string
          deposit_amount?: number
          deposit_required?: boolean
          deposit_type?: string
          display_name?: string | null
          email?: string | null
          extra_guest_fee?: number
          free_cancellation_days?: number
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
          max_advance_days?: number
          max_nights?: number
          min_guest_age?: number
          min_nights?: number
          no_show_fee?: number
          notify_booking_change?: boolean
          notify_booking_confirmation?: boolean
          notify_cancellation_confirmation?: boolean
          notify_checkin_reminder?: boolean
          notify_review_request?: boolean
          parties_allowed?: boolean
          payment_due_days?: number
          payment_methods?: Json
          pets_allowed?: boolean
          phone?: string | null
          postal_code?: string | null
          property_id?: string | null
          quiet_hours_from?: string
          quiet_hours_to?: string
          require_email?: boolean
          require_phone?: boolean
          review_link?: string | null
          review_request_hours_after?: number
          scope?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Update: {
          address?: string | null
          auto_confirm_bookings?: boolean
          auto_refund_deposit?: boolean
          bank_name?: string | null
          brand_email_logo_url?: string | null
          brand_logo_url?: string | null
          brand_pdf_logo_url?: string | null
          brand_primary_color?: string
          brand_secondary_color?: string
          cancellation_fee?: number
          cancellation_fee_type?: string
          cancellation_policy_text?: string | null
          checkin_from?: string
          checkin_reminder_hours_before?: number
          checkin_until?: string
          checkout_until?: string
          children_free_until_age?: number
          city?: string | null
          city_tax?: number
          city_tax_min_age?: number
          company_address?: string | null
          company_code?: string | null
          company_name?: string | null
          company_vat_code?: string | null
          country?: string
          created_at?: string
          currency?: string
          default_language?: string
          deposit_amount?: number
          deposit_required?: boolean
          deposit_type?: string
          display_name?: string | null
          email?: string | null
          extra_guest_fee?: number
          free_cancellation_days?: number
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
          max_advance_days?: number
          max_nights?: number
          min_guest_age?: number
          min_nights?: number
          no_show_fee?: number
          notify_booking_change?: boolean
          notify_booking_confirmation?: boolean
          notify_cancellation_confirmation?: boolean
          notify_checkin_reminder?: boolean
          notify_review_request?: boolean
          parties_allowed?: boolean
          payment_due_days?: number
          payment_methods?: Json
          pets_allowed?: boolean
          phone?: string | null
          postal_code?: string | null
          property_id?: string | null
          quiet_hours_from?: string
          quiet_hours_to?: string
          require_email?: boolean
          require_phone?: boolean
          review_link?: string | null
          review_request_hours_after?: number
          scope?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_contracts: {
        Row: {
          booking_id: string
          contract_content: string
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          pdf_url: string | null
          signature_text: string
          signed_at: string
          template_id: string | null
        }
        Insert: {
          booking_id: string
          contract_content: string
          created_at?: string
          customer_email?: string
          customer_name: string
          id?: string
          pdf_url?: string | null
          signature_text: string
          signed_at?: string
          template_id?: string | null
        }
        Update: {
          booking_id?: string
          contract_content?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          pdf_url?: string | null
          signature_text?: string
          signed_at?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signed_contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_door_code: { Args: { _property_id: string }; Returns: string }
      analytics_summary: { Args: { _from: string; _to: string }; Returns: Json }
      cancel_expired_pending_bookings: { Args: never; Returns: number }
      claim_invoice_number: {
        Args: never
        Returns: {
          number: number
          series: string
        }[]
      }
      get_active_booked_dates: {
        Args: never
        Returns: {
          date_from: string
          date_to: string
          property_id: string
        }[]
      }
      get_property_booked_dates: {
        Args: { _property_id: string }
        Returns: {
          date_from: string
          date_to: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_developer: { Args: { _user_id?: string }; Returns: boolean }
      is_owner: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "housekeeper"
        | "developer"
        | "owner"
        | "administrator"
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
      app_role: [
        "admin",
        "user",
        "housekeeper",
        "developer",
        "owner",
        "administrator",
      ],
    },
  },
} as const
