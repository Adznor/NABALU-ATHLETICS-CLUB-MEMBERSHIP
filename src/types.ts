export type MembershipType = 'Ahli Individu' | 'Ahli Remaja';

export type MembershipStatus = 'pending' | 'verified' | 'expired' | 'cancelled';

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
  membershipType: MembershipType;
  isOku: boolean;
  photoBase64?: string;
  receiptBase64?: string;
  membershipId?: string; // Generated after verification
  status: MembershipStatus;
  cancellationReason?: string;
  createdAt: any; // Tarikh Permohonan
  verifiedAt?: any; // Tarikh Disahkan
  cancelledAt?: any; // Tarikh Dibatalkan
  expiryDate?: any; // Tarikh Tamat Tempoh
  membershipNumber?: number;
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
}
