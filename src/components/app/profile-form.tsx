'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import { createAvatarUploadUrl } from '@/server/actions/uploads';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/lib/validations/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type ProfileFormProps = {
  name: string;
  image?: string | null;
};

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function ProfileForm({ name, image }: ProfileFormProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(image ?? '');

  const form = useForm<UpdateProfileInput>({
    resolver: standardSchemaResolver(updateProfileSchema),
    defaultValues: { name, image: image ?? '' },
  });

  const watchedName = useWatch({ control: form.control, name: 'name' }) || name;

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await createAvatarUploadUrl({
        contentType: file.type,
      });
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setImageUrl(publicUrl);
      form.setValue('image', publicUrl, { shouldDirty: true });
      toast.success('Avatar uploaded — save to apply.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: UpdateProfileInput) {
    setPending(true);
    const { error } = await authClient.updateUser({
      name: values.name,
      image: values.image || undefined,
    });
    setPending(false);

    if (error) {
      toast.error(error.message ?? 'Could not update profile');
      return;
    }
    toast.success('Profile updated');
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {imageUrl ? <AvatarImage src={imageUrl} alt={watchedName} /> : null}
            <AvatarFallback className="text-lg">
              {initials(watchedName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onAvatarSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              Change avatar
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPEG, or WebP.
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Button type="submit" disabled={pending || uploading}>
            {pending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
