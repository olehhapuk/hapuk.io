'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Org = { id: string; name: string; slug: string };

export function OrgSwitcher({
  organizations,
  activeId,
}: {
  organizations: Org[];
  activeId: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const active = organizations.find((o) => o.id === activeId);

  async function switchTo(organizationId: string) {
    if (organizationId === activeId) return;
    setSwitching(true);
    const { error } = await authClient.organization.setActive({
      organizationId,
    });
    setSwitching(false);
    if (error) {
      toast.error(error.message ?? 'Could not switch organization');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={switching}
          className="max-w-[12rem] gap-1"
        >
          <span className="truncate">{active?.name ?? 'Select org'}</span>
          <ChevronsUpDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onSelect={() => switchTo(org.id)}>
            <span className="truncate">{org.name}</span>
            {org.id === activeId ? <Check className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/organization/new">
            <Plus />
            Create organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
