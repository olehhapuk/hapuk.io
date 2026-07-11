'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { slugify } from '@/lib/validations/organization';
import { projectSchema, type ProjectInput } from '@/lib/validations/project';
import { createProject, updateProject } from '@/server/actions/projects';
import { locales, localeLabels } from '@/lib/i18n';
import { NOTE_VARIABLE_TOKENS } from '@/templates/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export const emptyProject: ProjectInput = {
  name: '',
  slug: '',
  description: '',
  senderName: '',
  senderAddress: '',
  senderTaxId: '',
  senderPhone: '',
  senderEmail: '',
  currency: 'USD',
  locale: 'en',
  defaultRate: '',
  defaultNotes: '',
  defaultDueDays: '30',
};

export function ProjectForm({
  mode,
  projectId,
  canManage,
  defaultValues,
}: {
  mode: 'create' | 'edit';
  projectId?: string;
  canManage: boolean;
  defaultValues: ProjectInput;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // In edit mode the slug already exists; don't overwrite it from the name.
  const [slugEdited, setSlugEdited] = useState(mode === 'edit');

  const form = useForm<ProjectInput>({
    resolver: standardSchemaResolver(projectSchema),
    defaultValues,
  });

  async function onSubmit(values: ProjectInput) {
    setPending(true);

    if (mode === 'create') {
      const result = await createProject(values);
      setPending(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Project created');
      router.push(`/projects/${result.projectId}`);
      router.refresh();
      return;
    }

    const result = await updateProject(projectId!, values);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Project updated');
    router.refresh();
  }

  return (
    <Form {...form}>
      <fieldset disabled={!canManage} className="contents">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Corp — Retainer"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!slugEdited) {
                          form.setValue('slug', slugify(e.target.value), {
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="acme-retainer"
                      {...field}
                      onChange={(e) => {
                        setSlugEdited(true);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Internal note about this client or engagement."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="senderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sender name</FormLabel>
                <FormControl>
                  <Input placeholder="Legal name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="senderAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street, city, country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="senderTaxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senderPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senderEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="USD"
                      maxLength={3}
                      className="uppercase"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default rate</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="100.00"
                      inputMode="decimal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultDueDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due in (days)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice language</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!canManage}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locales.map((code) => (
                        <SelectItem key={code} value={code}>
                          {localeLabels[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="defaultNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Payment terms, bank details, thank-you note…"
                    {...field}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  <span className="block">
                    Variables like <code>{'{{dueDate}}'}</code> are filled in on
                    each invoice:
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {NOTE_VARIABLE_TOKENS.map((token) => (
                      <code
                        key={token}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs"
                      >
                        {token}
                      </code>
                    ))}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {canManage ? (
            <div>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {mode === 'create' ? 'Create project' : 'Save changes'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can edit projects.
            </p>
          )}
        </form>
      </fieldset>
    </Form>
  );
}
