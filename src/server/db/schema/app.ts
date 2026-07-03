import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organization } from './auth';

/**
 * Domain tables. All tenant-owned rows carry `organizationId` (TEXT, references the
 * Better Auth `organization.id`). Never query these without scoping by the active org.
 */

export const invoiceStatus = pgEnum('invoice_status', [
  'draft', // being composed; no number yet; freely editable
  'waiting', // finalized/sent, awaiting payment
  'paid',
  'unpaid',
]);

/** Frozen party block copied onto an invoice at finalize. */
export type PartySnapshot = {
  name: string;
  address?: string;
  taxId?: string;
  phone?: string;
  email?: string;
};

/** Frozen signature copied onto an invoice at finalize. */
export type SignatureSnapshot = {
  imageUrl: string;
  label?: string;
};

export const invoiceTemplate = pgTable('invoice_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  // NULL organizationId => system/global template available to everyone.
  organizationId: text('organization_id').references(() => organization.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  key: text('key').notNull(), // maps to a React component in the template registry
  config: jsonb('config'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const project = pgTable(
  'project',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    // Sender defaults (the client on invoices):
    senderName: text('sender_name'),
    senderAddress: text('sender_address'),
    senderTaxId: text('sender_tax_id'),
    senderPhone: text('sender_phone'),
    senderEmail: text('sender_email'),

    // Invoice defaults:
    currency: text('currency').notNull().default('USD'),
    defaultRate: numeric('default_rate', { precision: 12, scale: 2 }),
    defaultNotes: text('default_notes'),
    defaultDueDays: integer('default_due_days').notNull().default(30),
    templateId: uuid('template_id').references(() => invoiceTemplate.id, {
      onDelete: 'set null',
    }),

    // Last used invoice number for this project (see numbering in README).
    invoiceCounter: integer('invoice_counter').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('project_org_slug_unique').on(t.organizationId, t.slug)],
);

export const service = pgTable('service', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  // NULL => fall back to project.defaultRate
  rate: numeric('rate', { precision: 12, scale: 2 }),
  unit: text('unit').notNull().default('h'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoice = pgTable(
  'invoice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),

    // NULL until finalized; auto-incremented per project on the draft -> waiting transition.
    number: integer('number'),
    status: invoiceStatus('status').notNull().default('draft'),
    finalizedAt: timestamp('finalized_at'),

    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    currency: text('currency').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),

    // Immutable snapshots so historical invoices never change when org/project are edited.
    senderSnapshot: jsonb('sender_snapshot').$type<PartySnapshot>(),
    receiverSnapshot: jsonb('receiver_snapshot').$type<PartySnapshot>(),
    signatureSnapshot: jsonb('signature_snapshot').$type<SignatureSnapshot>(),

    templateKey: text('template_key').notNull(),
    pdfUrl: text('pdf_url'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    // number is NULL for drafts; Postgres treats NULLs as distinct so multiple
    // drafts per project are allowed, while finalized numbers stay unique.
    uniqueIndex('invoice_project_number_unique').on(t.projectId, t.number),
  ],
);

export const invoiceItem = pgTable('invoice_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  // Nullable: a service may be edited/deleted later without breaking history.
  serviceId: uuid('service_id').references(() => service.id, {
    onDelete: 'set null',
  }),
  description: text('description').notNull(),
  qty: numeric('qty', { precision: 12, scale: 2 }).notNull(),
  rate: numeric('rate', { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
  position: integer('position').notNull().default(0),
});
