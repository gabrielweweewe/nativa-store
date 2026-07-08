export interface CustomerProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfileUpdateInput {
  fullName: string;
  phone?: string;
}
