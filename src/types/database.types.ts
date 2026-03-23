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
          agency_id: string
          agency_name: string | null
          logo_url: string | null
          brand_colour: string | null
          custom_domain: string | null
          agent_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          agency_id?: string
          agency_name?: string | null
          logo_url?: string | null
          brand_colour?: string | null
          custom_domain?: string | null
          agent_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agency_name?: string | null
          logo_url?: string | null
          brand_colour?: string | null
          custom_domain?: string | null
          agent_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          auth_user_id: string
          email: string | null
          full_name: string | null
          phone: string | null
          role: string | null
          agency_id: string | null
          contact_preference: string | null
          home_address_line1: string | null
          home_address_line2: string | null
          home_address_town: string | null
          home_address_county: string | null
          home_address_city: string | null
          home_address_postcode: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          role?: string | null
          agency_id?: string | null
          contact_preference?: string | null
          home_address_line1?: string | null
          home_address_line2?: string | null
          home_address_town?: string | null
          home_address_county?: string | null
          home_address_city?: string | null
          home_address_postcode?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          role?: string | null
          agency_id?: string | null
          contact_preference?: string | null
          home_address_line1?: string | null
          home_address_line2?: string | null
          home_address_town?: string | null
          home_address_county?: string | null
          home_address_city?: string | null
          home_address_postcode?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          seller_user_id: string | null
          user_id: string | null
          address: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          postcode: string | null
          property_type: string | null
          tenure: string | null
          bedrooms: number | null
          bathrooms: number | null
          council_tax_band: string | null
          epc_rating: string | null
          asking_price: string | null
          heating: string | null
          drainage: string | null
          parking: string | null
          building_changes: string | null
          is_link_active: boolean
          shareable_link_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_user_id?: string | null
          user_id?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          postcode?: string | null
          property_type?: string | null
          tenure?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          council_tax_band?: string | null
          epc_rating?: string | null
          asking_price?: string | null
          heating?: string | null
          drainage?: string | null
          parking?: string | null
          building_changes?: string | null
          is_link_active?: boolean
          shareable_link_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_user_id?: string | null
          user_id?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          postcode?: string | null
          property_type?: string | null
          tenure?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          council_tax_band?: string | null
          epc_rating?: string | null
          asking_price?: string | null
          heating?: string | null
          drainage?: string | null
          parking?: string | null
          building_changes?: string | null
          is_link_active?: boolean
          shareable_link_token?: string | null
          created_at?: string
          updated_at?: string
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
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          token?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          token?: string | null
          active?: boolean
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
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          name?: string | null
          file_url?: string | null
          document_type?: string | null
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          name?: string | null
          file_url?: string | null
          document_type?: string | null
          category?: string | null
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
