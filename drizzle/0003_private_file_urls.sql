-- The uploads bucket is now private. Rewrite stored direct-storage URLs
-- (https://<storage-host>/<bucket>/<key>, or AWS https://<bucket>.s3.<region>.amazonaws.com/<key>)
-- to the authenticated app route /api/files/<key>. External URLs (e.g. OAuth avatars) are left alone.
UPDATE "user"
SET "image" = regexp_replace("image", '^https?://[^/]+/(?:[^/]+/)?((?:avatars|signatures|invoices)/.+)$', '/api/files/\1')
WHERE "image" ~ '^https?://[^/]+/(?:[^/]+/)?(?:avatars|signatures|invoices)/.+$';--> statement-breakpoint
UPDATE "organization"
SET "signature_image_url" = regexp_replace("signature_image_url", '^https?://[^/]+/(?:[^/]+/)?((?:avatars|signatures|invoices)/.+)$', '/api/files/\1')
WHERE "signature_image_url" ~ '^https?://[^/]+/(?:[^/]+/)?(?:avatars|signatures|invoices)/.+$';--> statement-breakpoint
UPDATE "invoice"
SET "signature_snapshot" = jsonb_set(
  "signature_snapshot",
  '{imageUrl}',
  to_jsonb(regexp_replace("signature_snapshot"->>'imageUrl', '^https?://[^/]+/(?:[^/]+/)?((?:avatars|signatures|invoices)/.+)$', '/api/files/\1'))
)
WHERE "signature_snapshot"->>'imageUrl' ~ '^https?://[^/]+/(?:[^/]+/)?(?:avatars|signatures|invoices)/.+$';--> statement-breakpoint
UPDATE "invoice"
SET "pdf_url" = regexp_replace("pdf_url", '^https?://[^/]+/(?:[^/]+/)?((?:avatars|signatures|invoices)/.+)$', '/api/files/\1')
WHERE "pdf_url" ~ '^https?://[^/]+/(?:[^/]+/)?(?:avatars|signatures|invoices)/.+$';
