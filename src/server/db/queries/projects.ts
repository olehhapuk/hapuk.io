import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/server/db';
import { requireOrgContext } from './context';

/**
 * Org-scoped reads for projects & services. Every query filters by the active
 * organization — see the golden rule in context.ts.
 */

export type ProjectRow = typeof schema.project.$inferSelect;
export type ServiceRow = typeof schema.service.$inferSelect;

/** All projects in the active org, newest first, with a service count each. */
export async function listProjects(): Promise<
  Array<ProjectRow & { serviceCount: number }>
> {
  const ctx = await requireOrgContext();

  const projects = await db
    .select()
    .from(schema.project)
    .where(eq(schema.project.organizationId, ctx.organizationId))
    .orderBy(desc(schema.project.createdAt));

  if (projects.length === 0) return [];

  const counts = await db
    .select({
      projectId: schema.service.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.service)
    .where(eq(schema.service.organizationId, ctx.organizationId))
    .groupBy(schema.service.projectId);

  const countByProject = new Map(counts.map((c) => [c.projectId, c.count]));

  return projects.map((p) => ({
    ...p,
    serviceCount: countByProject.get(p.id) ?? 0,
  }));
}

/** A single project scoped to the active org, or null if not found/foreign. */
export async function getProject(id: string): Promise<ProjectRow | null> {
  const ctx = await requireOrgContext();

  const [row] = await db
    .select()
    .from(schema.project)
    .where(
      and(
        eq(schema.project.id, id),
        eq(schema.project.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/** Services for a project, scoped to the active org, oldest first. */
export async function listServices(projectId: string): Promise<ServiceRow[]> {
  const ctx = await requireOrgContext();

  return db
    .select()
    .from(schema.service)
    .where(
      and(
        eq(schema.service.projectId, projectId),
        eq(schema.service.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(asc(schema.service.createdAt));
}
