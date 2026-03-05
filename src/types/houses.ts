import type { IsoDateTimeString } from "./primitives";

// joinPassword / joinPasswordHash must never be included in this type.
// Passwords are stored as scrypt hashes in Firestore and must not be exposed in API responses.
export type House = {
  id: string;
  name: string;
  description?: string;
  ownerUid?: string;
  memberUids: string[];
  hostUids: string[];
  createdAt: IsoDateTimeString;
};
