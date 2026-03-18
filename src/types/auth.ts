export interface PermitParams {
  account: string;
  signer: string;
  nonce: string;
  deadline: string;
  signature: string;
}

export interface SignerInfo {
  signer: string;
  account: string;
  expiration: number;
  label?: string;
  status: number;
  [key: string]: unknown;
}

export interface SessionKeyStatus {
  status: number;
  [key: string]: unknown;
}

export interface RegisterSignerResult {
  alreadyActive?: boolean;
  [key: string]: unknown;
}
