/**
 * Organization additional fields (invoice RECEIVER defaults + signature).
 * Shared by the Better Auth server config and the client plugin so the API and
 * the typed client stay in sync. Mirrors the columns in schema/auth.ts.
 */
export const orgAdditionalFields = {
  receiverName: { type: 'string', required: false },
  receiverAddress: { type: 'string', required: false },
  receiverTaxId: { type: 'string', required: false },
  receiverPhone: { type: 'string', required: false },
  receiverEmail: { type: 'string', required: false },
  signatureImageUrl: { type: 'string', required: false },
  signatureLabel: { type: 'string', required: false },
} as const;
