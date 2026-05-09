export type MembershipType = 'Ahli Individu' | 'Ahli Remaja' | 'Ahli Kehormat';

export type MembershipStatus = 'pending' | 'verified' | 'expired' | 'cancelled';

export interface AnnualPayment {
  year: number;
  paid: boolean;
  verifiedAt?: any;
}

export interface Member {
  id?: string;
  fullName: string;
  icNumber: string;
  dob: string;
  gender: 'Lelaki' | 'Perempuan';
  address: string;
  phone: string;
  email: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianIc?: string;
  membershipType: MembershipType;
  photoBase64?: string;
  receiptBase64?: string;
  membershipId?: string; // Generated after verification
  status: MembershipStatus;
  cancellationReason?: string;
  createdAt: any; // Tarikh Permohonan
  verifiedAt?: any; // Tarikh Disahkan
  cancelledAt?: any; // Tarikh Dibatalkan
  membershipNumber?: number;
  // Treasurer fields
  registrationFeePaid: boolean;
  registrationFeeVerifiedAt?: any;
  annualPayments: AnnualPayment[];
}

export interface LogEntry {
  id?: string;
  category: 'member' | 'system' | 'payment';
  action: string;
  details: string;
  adminId?: string;
  adminEmail?: string;
  timestamp: any;
  targetMemberId?: string;
}

export interface ClubSettings {
  clubName: string;
  clubNameEn?: string;
  mission: string;
  missionEn?: string;
  vision: string;
  visionEn?: string;
  logoBase64?: string;
  terms: string;
  termsPdfUrl?: string;
  bankInfo?: string;
  registrationOpen: boolean;
}
