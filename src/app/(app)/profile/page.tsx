import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProfileForm } from '@/components/app/profile-form';
import { ChangePasswordForm } from '@/components/app/change-password-form';

export const metadata: Metadata = { title: 'Profile — hapuk.io' };

export default async function ProfilePage() {
  const { user } = await requireUser();

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal info</CardTitle>
          <CardDescription>
            Signed in as {user.email}
            {user.emailVerified ? '' : ' (unverified)'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} image={user.image} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing your password signs out other sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
