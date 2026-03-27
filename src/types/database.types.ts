export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          agency_name: string | null
          logo_url: string | null
          brand_colour: string | null
          custom_domain: string | null
          agent_user_id: string | null
          // trading address
          trading_address_line1: string | null
          trading_address_line2: string | null
          trading_address_town: string | null
          trading_address_county: string | null
          trading_address_postcode: string | null
          // contact & registration
          phone: string | null
          company_registration_number: string | null
          vat_number: string | null
          naea_number: string | null
          // signatory
          authorised_signatory_name: string | null
          authorised_signatory_title: string | null
          // terms
          terms_agreed: boolean | null
          terms_agreed_at: string | null
          terms_version: string | null
          dpa_agreed: boolean | null
          dpa_agreed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_name?: string | null
          logo_url?: string | null
          brand_colour?: string | null
          custom_domain?: string | null
          agent_user_id?: string | null
          trading_address_line1?: string | null
          trading_address_line2?: string | null
          trading_address_town?: string | null
          trading_address_county?: string | null
          trading_address_postcode?: string | null
          phone?: string | null
          company_registration_number?: string | null
          vat_number?: string | null
          naea_number?: string | null
          authorised_signatory_name?: string | null
          authorised_signatory_title?: string | null
          terms_agreed?: boolean | null
          terms_agreed_at?: string | null
          terms_version?: string | null
          dpa_agreed?: boolean | null
          dpa_agreed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_name?: string | null
          logo_url?: string | null
          brand_colour?: string | null
          custom_domain?: string | null
          agent_user_id?: string | null
          trading_address_line1?: string | null
          trading_address_line2?: string | null
          trading_address_town?: string | null
          trading_address_county?: string | null
          trading_address_postcode?: string | null
          phone?: string | null
          company_registration_number?: string | null
          vat_number?: string | null
          naea_number?: string | null
          authorised_signatory_name?: string | null
          authorised_signatory_title?: string | null
          terms_agreed?: boolean | null
          terms_agreed_at?: string | null
          terms_version?: string | null
          dpa_agreed?: boolean | null
          dpa_agreed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          user_type: string | null
          onboarding_complete: boolean | null
          created_at: string
          auth_user_id: string
          role: string | null
          agency_id: string | null
          contact_preference: string | null
          home_address_line1: string | null
          home_address_line2: string | null
          home_address_town: string | null
          home_address_county: string | null
          home_address_postcode: string | null
          home_address_city: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          user_type?: string | null
          onboarding_complete?: boolean | null
          created_at?: string
          auth_user_id: string
          role?: string | null
          agency_id?: string | null
          contact_preference?: string | null
          home_address_line1?: string | null
          home_address_line2?: string | null
          home_address_town?: string | null
          home_address_county?: string | null
          home_address_postcode?: string | null
          home_address_city?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          user_type?: string | null
          onboarding_complete?: boolean | null
          created_at?: string
          auth_user_id?: string
          role?: string | null
          agency_id?: string | null
          contact_preference?: string | null
          home_address_line1?: string | null
          home_address_line2?: string | null
          home_address_town?: string | null
          home_address_county?: string | null
          home_address_postcode?: string | null
          home_address_city?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          seller_user_id: string | null
          agency_id: string | null
          address_line1: string | null
          address_line2: string | null
          address_town: string | null
          address_county: string | null
          address_city: string | null
          address_postcode: string | null
          property_type: string | null
          tenure: string | null
          bedrooms: number | null
          bathrooms: number | null
          council_tax_band: string | null
          epc_rating: string | null
          year_built: number | null
          square_footage: number | null
          description: string | null
          status: string | null
          is_link_active: boolean
          shareable_link_token: string | null
          pack_completion_percentage: number | null
          created_at: string
        }
        Insert: {
          id?: string
          seller_user_id?: string | null
          agency_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_town?: string | null
          address_county?: string | null
          address_city?: string | null
          address_postcode?: string | null
          property_type?: string | null
          tenure?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          council_tax_band?: string | null
          epc_rating?: string | null
          year_built?: number | null
          square_footage?: number | null
          description?: string | null
          status?: string | null
          is_link_active?: boolean
          shareable_link_token?: string | null
          pack_completion_percentage?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          seller_user_id?: string | null
          agency_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_town?: string | null
          address_county?: string | null
          address_city?: string | null
          address_postcode?: string | null
          property_type?: string | null
          tenure?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          council_tax_band?: string | null
          epc_rating?: string | null
          year_built?: number | null
          square_footage?: number | null
          description?: string | null
          status?: string | null
          is_link_active?: boolean
          shareable_link_token?: string | null
          pack_completion_percentage?: number | null
          created_at?: string
        }
        Relationships: []
      }
      material_information: {
        Row: {
          id: string
          property_id: string | null
          utilities: Json | null
          water_supply: string | null
          electricity_supply: string | null
          broadband_speed: string | null
          mobile_signal: string | null
          parking: string | null
          flooding_risk: string | null
          flood_risk: string | null
          building_safety: string | null
          planning_history: string | null
          planning_permissions: string | null
          disputes_notices: string | null
          building_reg_works: string | null
          disputes: string | null
          restrictions: string | null
          rights_easements: string | null
          coastal_erosion: string | null
          coalfield_area: string | null
          building_regs_required: boolean | null
          epc_rating: string | null
          epc_expiry: string | null
          construction_age_band: string | null
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          utilities?: Json | null
          water_supply?: string | null
          electricity_supply?: string | null
          broadband_speed?: string | null
          mobile_signal?: string | null
          parking?: string | null
          flooding_risk?: string | null
          flood_risk?: string | null
          building_safety?: string | null
          planning_history?: string | null
          planning_permissions?: string | null
          disputes_notices?: string | null
          building_reg_works?: string | null
          disputes?: string | null
          restrictions?: string | null
          rights_easements?: string | null
          coastal_erosion?: string | null
          coalfield_area?: string | null
          building_regs_required?: boolean | null
          updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          utilities?: Json | null
          water_supply?: string | null
          electricity_supply?: string | null
          broadband_speed?: string | null
          mobile_signal?: string | null
          parking?: string | null
          flooding_risk?: string | null
          flood_risk?: string | null
          building_safety?: string | null
          planning_history?: string | null
          planning_permissions?: string | null
          disputes_notices?: string | null
          building_reg_works?: string | null
          disputes?: string | null
          restrictions?: string | null
          rights_easements?: string | null
          coastal_erosion?: string | null
          coalfield_area?: string | null
          building_regs_required?: boolean | null
          updated_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      shares: {
        Row: {
          id: string
          property_id: string | null
          token: string | null
          active: boolean
          view_count: number
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          token?: string | null
          active?: boolean
          view_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          token?: string | null
          active?: boolean
          view_count?: number
          created_at?: string
        }
        Relationships: []
      }
      seller_declarations: {
        Row: {
          id: string
          property_id: string | null
          seller_user_id: string | null
          confirms_accuracy: boolean
          confirms_ai_review: boolean
          signed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          seller_user_id?: string | null
          confirms_accuracy?: boolean
          confirms_ai_review?: boolean
          signed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          seller_user_id?: string | null
          confirms_accuracy?: boolean
          confirms_ai_review?: boolean
          signed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          property_id: string | null
          name: string | null
          file_url: string | null
          document_type: string | null
          status: string | null
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          property_id?: string | null
          name?: string | null
          file_url?: string | null
          document_type?: string | null
          status?: string | null
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string | null
          name?: string | null
          file_url?: string | null
          document_type?: string | null
          status?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      pack_viewers: {
        Row: {
          id: string
          property_id: string | null
          viewer_name: string | null
          viewer_email: string | null
          viewer_phone: string | null
          viewed_at: string
          is_selling: boolean
          selling_location: string | null
        }
        Insert: {
          id?: string
          property_id?: string | null
          viewer_name?: string | null
          viewer_email?: string | null
          viewer_phone?: string | null
          viewed_at?: string
          is_selling?: boolean
          selling_location?: string | null
        }
        Update: {
          id?: string
          property_id?: string | null
          viewer_name?: string | null
          viewer_email?: string | null
          viewer_phone?: string | null
          viewed_at?: string
          is_selling?: boolean
          selling_location?: string | null
        }
        Relationships: []
      }
      property_intelligence: {
        Row: {
          id: string
          property_id: string | null
          flood_zone: string | null
          flood_risk_score: string | null
          council_tax_band: string | null
          broadband_max_speed_mbps: number | null
          broadband_availability: string | null
          crime_rate: string | null
          crime_category: string | null
          epc_rating: string | null
          epc_expiry_date: string | null
          conservation_area: boolean | null
          listed_building: string | null
          recent_sales: Json | null
          data_fetched_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          flood_zone?: string | null
          flood_risk_score?: string | null
          council_tax_band?: string | null
          broadband_max_speed_mbps?: number | null
          broadband_availability?: string | null
          crime_rate?: string | null
          crime_category?: string | null
          epc_rating?: string | null
          epc_expiry_date?: string | null
          conservation_area?: boolean | null
          listed_building?: string | null
          recent_sales?: Json | null
          data_fetched_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          flood_zone?: string | null
          flood_risk_score?: string | null
          council_tax_band?: string | null
          broadband_max_speed_mbps?: number | null
          broadband_availability?: string | null
          crime_rate?: string | null
          crime_category?: string | null
          epc_rating?: string | null
          epc_expiry_date?: string | null
          conservation_area?: boolean | null
          listed_building?: string | null
          recent_sales?: Json | null
          data_fetched_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      nearby_schools: {
        Row: {
          id: string
          property_id: string | null
          school_name: string | null
          school_type: string | null
          phase: string | null
          ofsted_rating: string | null
          ofsted_rating_label: string | null
          distance_miles: number | null
          address: string | null
          postcode: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          school_name?: string | null
          school_type?: string | null
          phase?: string | null
          ofsted_rating?: string | null
          ofsted_rating_label?: string | null
          distance_miles?: number | null
          address?: string | null
          postcode?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          school_name?: string | null
          school_type?: string | null
          phase?: string | null
          ofsted_rating?: string | null
          ofsted_rating_label?: string | null
          distance_miles?: number | null
          address?: string | null
          postcode?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_share_view: {
        Args: { p_token: string }
        Returns: undefined
      }
      get_public_pack_share_property: {
        Args: { p_token: string }
        Returns: Json | null
      }
      get_public_pack_details: {
        Args: { p_token: string }
        Returns: Json | null
      }
      register_public_pack_viewer: {
        Args: {
          p_token: string
          p_viewer_name: string
          p_viewer_email: string
          p_viewer_phone: string
          p_is_selling: boolean
          p_selling_location: string | null
        }
        Returns: Json
      }
      get_property_intelligence_by_token: {
        Args: { p_token: string }
        Returns: Json | null
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
