// ISOLATED CONTRACT SYSTEM - ZERO DEPENDENCIES ON MAIN SYSTEM
// This prevents cascading failures when other systems are modified

export interface IsolatedContractData {
  id: number;
  userId: string;
  contractNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  venue?: string;
  venueAddress?: string;
  eventDate: Date;
  eventTime: string;
  eventEndTime: string;
  fee: string;
  deposit?: string;
  paymentInstructions?: string;
  equipmentRequirements?: string;
  specialRequirements?: string;
  template?: string;
  status?: string;
  cloudStorageUrl?: string;
  cloudStorageKey?: string;
  signingPageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IsolatedUserSettings {
  id?: number;
  userId: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessWebsite?: string;
  bankName?: string;
  bankAccountName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  vatNumber?: string;
  vatRegistered?: boolean;
  companyNumber?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  patTestingExpiry?: Date;
  publicLiabilityAmount?: string;
}

export interface IsolatedEmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: any[];
}

export interface IsolatedEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IsolatedUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}