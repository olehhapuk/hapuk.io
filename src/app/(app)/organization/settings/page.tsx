import type { Metadata } from 'next';
import { requireActiveOrg, canManage } from '@/server/auth/org';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OrgProfileForm } from '@/components/org/org-profile-form';
import { OrgLocaleForm } from '@/components/org/org-locale-form';
import { SignatureManager } from '@/components/org/signature-manager';
import type {
  OrgLocaleInput,
  OrgProfileInput,
} from '@/lib/validations/organization';
import { DEFAULT_LOCALE, locales, localeLabels } from '@/lib/i18n';
import { getOrgLocaleOverrides } from '@/server/db/queries/organization';

export const metadata: Metadata = { title: 'Organization settings — hapuk.io' };

export default async function OrganizationSettingsPage() {
  const { organization, role } = await requireActiveOrg();
  const manage = canManage(role);

  // Org additionalFields come back on the full organization object.
  const org = organization as typeof organization & {
    receiverName?: string | null;
    receiverAddress?: string | null;
    receiverTaxId?: string | null;
    receiverPhone?: string | null;
    receiverEmail?: string | null;
    signatureImageUrl?: string | null;
    signatureLabel?: string | null;
  };

  const defaultValues: OrgProfileInput = {
    name: org.name,
    slug: org.slug,
    receiverName: org.receiverName ?? '',
    receiverAddress: org.receiverAddress ?? '',
    receiverTaxId: org.receiverTaxId ?? '',
    receiverPhone: org.receiverPhone ?? '',
    receiverEmail: org.receiverEmail ?? '',
    signatureLabel: org.signatureLabel ?? '',
  };

  // The base fields above are the default-language values; other languages override them.
  const overrides = await getOrgLocaleOverrides(org.id);
  const otherLocales = locales.filter((l) => l !== DEFAULT_LOCALE);
  const fallback = {
    receiverName: org.receiverName ?? org.name,
    receiverAddress: org.receiverAddress ?? '',
    signatureLabel: org.signatureLabel ?? '',
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization settings
        </h1>
        <p className="text-muted-foreground">
          Identity, invoice receiver defaults, and signature.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile ({localeLabels[DEFAULT_LOCALE]})</CardTitle>
          <CardDescription>
            Your organization&apos;s identity and invoice receiver details, in
            your default language. Invoices in another language fall back to
            these when a translation is left blank.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgProfileForm
            organizationId={org.id}
            canManage={manage}
            defaultValues={defaultValues}
          />
        </CardContent>
      </Card>

      {otherLocales.map((code) => {
        const row = overrides[code];
        const localeDefaults: OrgLocaleInput = {
          receiverName: row?.receiverName ?? '',
          receiverAddress: row?.receiverAddress ?? '',
          signatureLabel: row?.signatureLabel ?? '',
        };
        return (
          <Card key={code}>
            <CardHeader>
              <CardTitle>Receiver details ({localeLabels[code]})</CardTitle>
              <CardDescription>
                Used on invoices for projects set to {localeLabels[code]}. Leave
                a field blank to reuse the default-language value (shown as a
                placeholder).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgLocaleForm
                locale={code}
                canManage={manage}
                defaultValues={localeDefaults}
                fallback={fallback}
              />
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Signature</CardTitle>
          <CardDescription>
            Applied to invoices for this organization. Upload an image or draw
            it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureManager
            organizationId={org.id}
            canManage={manage}
            signatureImageUrl={org.signatureImageUrl ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
