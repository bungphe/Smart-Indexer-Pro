export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export enum IndexingStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  SUBMITTING = 'SUBMITTING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum UrlQuality {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface UrlItem {
  id: string;
  url: string;
  status: IndexingStatus;
  qualityScore?: number;
  qualityLabel?: UrlQuality;
  analysis?: string; // Gemini feedback
  requestType: 'URL_UPDATED' | 'URL_DELETED';
}

export interface AnalysisResponse {
  items: {
    url: string;
    qualityLabel: UrlQuality;
    qualityScore: number;
    reasoning: string;
  }[];
}
