'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db, schema } from '@/server/db';
import { assertRole, requireOrgContext } from '@/server/db/queries/context';
import {
  projectSchema,
  serviceSchema,
  type ProjectInput,
  type ServiceInput,
} from '@/lib/validations/project';

/** Roles allowed to create/edit/delete projects & services. */
const MANAGE_ROLES = ['owner', 'admin'];

/**
 * Plain result shapes (not discriminated unions) so callers can read optional
 * payload fields after a simple `if (result.error)` guard without union narrowing.
 */
type ActionResult = { error?: string };
type CreateProjectResult = ActionResult & { projectId?: string };

/** '' | undefined => null, otherwise the trimmed value. */
function emptyToNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: string }).code === '23505'
  );
}

export async function createProject(
  input: ProjectInput,
): Promise<CreateProjectResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };
  const v = parsed.data;

  try {
    const [row] = await db
      .insert(schema.project)
      .values({
        organizationId: ctx.organizationId,
        name: v.name.trim(),
        slug: v.slug,
        description: emptyToNull(v.description),
        senderName: emptyToNull(v.senderName),
        senderAddress: emptyToNull(v.senderAddress),
        senderTaxId: emptyToNull(v.senderTaxId),
        senderPhone: emptyToNull(v.senderPhone),
        senderEmail: emptyToNull(v.senderEmail),
        currency: v.currency.toUpperCase(),
        defaultRate: emptyToNull(v.defaultRate),
        defaultNotes: emptyToNull(v.defaultNotes),
        defaultDueDays: Number(v.defaultDueDays),
      })
      .returning({ id: schema.project.id });

    revalidatePath('/projects');
    return { projectId: row.id };
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: 'A project with this slug already exists.' };
    }
    throw e;
  }
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };
  const v = parsed.data;

  try {
    const updated = await db
      .update(schema.project)
      .set({
        name: v.name.trim(),
        slug: v.slug,
        description: emptyToNull(v.description),
        senderName: emptyToNull(v.senderName),
        senderAddress: emptyToNull(v.senderAddress),
        senderTaxId: emptyToNull(v.senderTaxId),
        senderPhone: emptyToNull(v.senderPhone),
        senderEmail: emptyToNull(v.senderEmail),
        currency: v.currency.toUpperCase(),
        defaultRate: emptyToNull(v.defaultRate),
        defaultNotes: emptyToNull(v.defaultNotes),
        defaultDueDays: Number(v.defaultDueDays),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.project.id, id),
          eq(schema.project.organizationId, ctx.organizationId),
        ),
      )
      .returning({ id: schema.project.id });

    if (updated.length === 0) return { error: 'Project not found.' };

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    return {};
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: 'A project with this slug already exists.' };
    }
    throw e;
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const deleted = await db
    .delete(schema.project)
    .where(
      and(
        eq(schema.project.id, id),
        eq(schema.project.organizationId, ctx.organizationId),
      ),
    )
    .returning({ id: schema.project.id });

  if (deleted.length === 0) return { error: 'Project not found.' };

  revalidatePath('/projects');
  return {};
}

/** Confirms the project exists in the active org; returns its id or throws. */
async function assertProjectInOrg(
  projectId: string,
  organizationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.project.id })
    .from(schema.project)
    .where(
      and(
        eq(schema.project.id, projectId),
        eq(schema.project.organizationId, organizationId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function createService(
  projectId: string,
  input: ServiceInput,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };
  const v = parsed.data;

  if (!(await assertProjectInOrg(projectId, ctx.organizationId))) {
    return { error: 'Project not found.' };
  }

  await db.insert(schema.service).values({
    projectId,
    organizationId: ctx.organizationId,
    name: v.name.trim(),
    description: emptyToNull(v.description),
    rate: emptyToNull(v.rate),
    unit: v.unit.trim(),
    isActive: v.isActive,
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function updateService(
  serviceId: string,
  input: ServiceInput,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };
  const v = parsed.data;

  const updated = await db
    .update(schema.service)
    .set({
      name: v.name.trim(),
      description: emptyToNull(v.description),
      rate: emptyToNull(v.rate),
      unit: v.unit.trim(),
      isActive: v.isActive,
    })
    .where(
      and(
        eq(schema.service.id, serviceId),
        eq(schema.service.organizationId, ctx.organizationId),
      ),
    )
    .returning({ projectId: schema.service.projectId });

  if (updated.length === 0) return { error: 'Service not found.' };

  revalidatePath(`/projects/${updated[0].projectId}`);
  return {};
}

export async function deleteService(serviceId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const deleted = await db
    .delete(schema.service)
    .where(
      and(
        eq(schema.service.id, serviceId),
        eq(schema.service.organizationId, ctx.organizationId),
      ),
    )
    .returning({ projectId: schema.service.projectId });

  if (deleted.length === 0) return { error: 'Service not found.' };

  revalidatePath(`/projects/${deleted[0].projectId}`);
  return {};
}
