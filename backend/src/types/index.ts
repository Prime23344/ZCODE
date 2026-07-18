// ─── Enums / Union Types ─────────────────────────────────

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED';

export type BookingStatus =
  | 'REQUESTED'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAID'
  | 'REVIEWED'
  | 'CANCELLED'
  | 'DISPUTED';

export type PaymentStatus =
  | 'PENDING'
  | 'ESCROW'
  | 'RELEASED'
  | 'REFUNDED'
  | 'PARTIAL';

export type DisputeStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type DisputeResolution =
  | 'REFUND_CUSTOMER'
  | 'RELEASE_PAYMENT'
  | 'PARTIAL_SPLIT'
  | 'MORE_INFO';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type DocumentType =
  | 'NATIONAL_ID'
  | 'PASSPORT'
  | 'SKILL_CERTIFICATE'
  | 'OTHER';

// ─── Data Interfaces ──────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  countryCode: string;
  createdAt: string;
  provider?: Provider | null;
}

export interface Provider {
  id: string;
  userId: string;
  bio: string;
  location: string;
  county: string;
  averageRating: number;
  ratingCount: number;
  responseTimeMinutes: number | null;
  verificationStatus: VerificationStatus;
  verificationRejectionReason: string | null;
  countryCode: string;
  user: User;
  verificationDocuments?: VerificationDocument[];
  categories?: ServiceCategory[];
  portfolioPhotos?: PortfolioPhoto[];
}

export interface VerificationDocument {
  id: string;
  providerId: string;
  documentType: DocumentType;
  issuingCountry: string;
  fileUrl: string;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
  countryCode: string;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  categoryId: string;
  status: BookingStatus;
  description: string;
  location: string;
  county: string;
  scheduledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  quoteAmount: number | null;
  quoteDuration: number | null;
  quoteCurrency: string;
  quotedAt: string | null;
  commissionRate: number;
  countryCode: string;
  customer: User;
  provider: Provider;
  category: ServiceCategory;
  messages?: BookingMessage[];
  payments?: Payment[];
  reviews?: Review[];
  disputes?: Dispute[];
  createdAt: string;
  updatedAt: string;
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: User;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currencyCode: string;
  status: PaymentStatus;
  commissionAmount: number;
  providerPayoutAmount: number;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  providerId: string;
  rating: number;
  text: string;
  providerResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  customer?: User;
  provider?: Provider;
}

export interface Dispute {
  id: string;
  bookingId: string;
  openedById: string;
  reason: string;
  status: DisputeStatus;
  resolutionType: DisputeResolution | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  openedBy?: User;
  booking?: Booking;
  evidence?: DisputeEvidence[];
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PortfolioPhoto {
  id: string;
  providerId: string;
  fileUrl: string;
  caption: string;
  createdAt: string;
}

// ─── API Request/Response Types ──────────────────────────

export interface LoginRequest {
  phone: string;
  countryCode?: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SignupRequest {
  phone: string;
  fullName: string;
  email?: string;
  role: UserRole;
  countryCode?: string;
}

export interface CreateBookingRequest {
  providerId: string;
  categoryId: string;
  description: string;
  location: string;
  county: string;
  scheduledAt?: string;
}

export interface QuoteRequest {
  amount: number;
  duration: number; // minutes
  currency?: string;
}

export interface CreateReviewRequest {
  rating: number;
  text: string;
}

export interface CreateDisputeRequest {
  reason: string;
  evidenceFileIds?: string[];
}

export interface SearchProvidersQuery {
  category?: string;
  county?: string;
  minRating?: number;
  verifiedOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Dashboard KPI Types ──────────────────────────────────

export interface DashboardKPIs {
  totalUsers: number;
  totalCustomers: number;
  totalProviders: number;
  newSignupsToday: number;
  newSignups7d: number;
  newSignups30d: number;
  pendingVerification: number;
  bookingsByStatus: Record<BookingStatus, number>;
  bookingsToday: number;
  bookings30d: number;
  grossBookingValue30d: number;
  platformCommission30d: number;
  averageRating: number;
  reviewVolume30d: number;
  openDisputes: number;
  openTickets: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}
