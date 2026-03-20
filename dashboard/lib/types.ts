// ============================================================
// TypeScript types matching the Supabase schema
// ============================================================

export type BusinessStatus =
  | "new"
  | "analyzing"
  | "scored"
  | "demo_generated"
  | "outreach_drafted"
  | "outreach_approved"
  | "outreach_sent"
  | "converted"
  | "skip"
  | "no_response";

export type PriorityTier = "skip_remake" | "candidate" | "high_priority" | "no_site";

export type OutreachDraftStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "sent"
  | "rejected"
  | "bounced"
  | "replied";

export interface Business {
  id: string;
  google_place_id: string | null;
  name: string;
  phone: string | null;
  website_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  rating: number | null;
  review_count: number;
  category: string | null;
  niche: string;
  source: string;
  status: BusinessStatus;
  extracted_content: ExtractedContent | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedContent {
  services_offered: string[];
  service_areas: string[];
  years_in_business: number | null;
  trust_signals: string[];
  unique_selling_points: string[];
  owner_name: string | null;
  tone: "friendly" | "professional" | "formal" | "family_run";
}

export interface WebsiteAnalysis {
  id: string;
  business_id: string;
  analyzed_url: string | null;
  screenshot_desktop_url: string | null;
  screenshot_mobile_url: string | null;
  page_html: string | null;
  pagespeed_score: number | null;
  visual_score: number | null;
  mobile_score: number | null;
  trust_score: number | null;
  cta_score: number | null;
  service_clarity_score: number | null;
  contact_friction_score: number | null;
  speed_score: number | null;
  review_usage_score: number | null;
  quote_flow_score: number | null;
  professionalism_score: number | null;
  total_score: number | null;
  priority_tier: PriorityTier | null;
  ai_analysis_notes: string | null;
  top_3_weaknesses: string[] | null;
  raw_scores_json: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}

export interface DemoSite {
  id: string;
  business_id: string;
  template_id: string | null;
  preview_url: string | null;
  generated_html: string | null;
  storage_path: string | null;
  injection_data: Record<string, unknown> | null;
  ai_content: Record<string, unknown> | null;
  status: "generating" | "ready" | "published" | "archived";
  error: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  source: string | null;
  confidence: "high" | "medium" | "low" | null;
  verified: boolean;
  created_at: string;
}

export interface OutreachDraft {
  id: string;
  business_id: string;
  contact_id: string | null;
  demo_site_id: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  comparison_url: string | null;
  status: OutreachDraftStatus;
  rejection_notes: string | null;
  admin_notes: string | null;
  resend_message_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  // Joined fields
  businesses?: Pick<Business, "name" | "city" | "state" | "website_url">;
  contacts?: Pick<Contact, "name" | "email">;
}

export interface Campaign {
  id: string;
  name: string;
  niche: string;
  city: string | null;
  state: string | null;
  status: "active" | "paused" | "complete";
  leads_count: number;
  search_query: string | null;
  created_at: string;
}

export type HostingStatus = "pending" | "live" | "suspended";

export type ClientPlan = "basic" | "pro" | "ai_agent";

export interface AiAgentConfig {
  business_name?: string;
  phone?: string;
  city?: string;
  services?: string;
  service_areas?: string;
  hours?: string;
  pricing_range?: string;
  escalation_trigger?: string;
}

export interface ClientSite {
  id: string;
  business_id: string;
  domain: string | null;
  plan: ClientPlan;
  monthly_fee: number | null;
  hosting_status: HostingStatus;
  live_at: string | null;
  ai_agent_config: AiAgentConfig | null;
  onboarding_data: Record<string, unknown> | null;
  change_requests: unknown[];
  vercel_project_id: string | null;
  vercel_deployment_url: string | null;
  notes: string | null;
  created_at: string;
  // Joined field
  businesses?: Pick<Business, "name" | "city" | "state" | "phone" | "website_url"> | null;
}

// ============================================================
// Dashboard stat types
// ============================================================

export interface DashboardStats {
  totalLeads: number;
  scored: number;
  demosGenerated: number;
  pendingApproval: number;
  sent: number;
  converted: number;
}
