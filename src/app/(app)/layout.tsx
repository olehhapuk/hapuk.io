import Link from 'next/link';
import { requireUser } from '@/server/auth/session';
import {
  getActiveOrganization,
  listUserOrganizations,
} from '@/server/auth/org';
import { UserMenu } from '@/components/app/user-menu';
import { AppNav } from '@/components/app/app-nav';
import { OrgSwitcher } from '@/components/org/org-switcher';
import { Separator } from '@/components/ui/separator';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  const [organizations, activeOrg] = await Promise.all([
    listUserOrganizations(),
    getActiveOrganization(),
  ]);
  const hasOrg = Boolean(activeOrg);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            hapuk<span className="text-muted-foreground">.io</span>
          </Link>

          {hasOrg && activeOrg ? (
            <>
              <Separator
                orientation="vertical"
                className="h-6 data-vertical:self-center"
              />
              <OrgSwitcher
                organizations={organizations.map((o) => ({
                  id: o.id,
                  name: o.name,
                  slug: o.slug,
                }))}
                activeId={activeOrg.id}
              />
              <div className="ml-2 hidden md:block">
                <AppNav />
              </div>
            </>
          ) : null}

          <div className="ml-auto">
            <UserMenu name={user.name} email={user.email} image={user.image} />
          </div>
        </div>
        {hasOrg ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-2 md:hidden">
            <AppNav />
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
