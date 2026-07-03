'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Send, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import type { InvoiceStatus } from '@/server/db/queries/invoices';
import type { SettleableStatus } from '@/lib/validations/invoice';
import {
  deleteInvoice,
  finalizeInvoice,
  setInvoiceStatus,
} from '@/server/actions/invoices';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function InvoiceStatusActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function finalize() {
    setBusy('finalize');
    const result = await finalizeInvoice(invoiceId);
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Invoice finalized and numbered');
    router.refresh();
  }

  async function changeStatus(next: SettleableStatus) {
    setBusy(next);
    const result = await setInvoiceStatus(invoiceId, next);
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Marked ${next}`);
    router.refresh();
  }

  async function onDelete() {
    setBusy('delete');
    const result = await deleteInvoice(invoiceId);
    if (result.error) {
      setBusy(null);
      toast.error(result.error);
      return;
    }
    toast.success('Invoice deleted');
    router.push('/invoices');
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={busy !== null}>
              {busy === 'finalize' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send />
              )}
              Finalize
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                It gets the next number for this project and can no longer be
                edited. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  finalize();
                }}
              >
                Finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <>
          {status !== 'paid' ? (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => changeStatus('paid')}
            >
              {busy === 'paid' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCircle2 />
              )}
              Mark paid
            </Button>
          ) : null}
          {status !== 'unpaid' ? (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => changeStatus('unpaid')}
            >
              {busy === 'unpaid' ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Mark unpaid
            </Button>
          ) : null}
          {status !== 'waiting' ? (
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={() => changeStatus('waiting')}
            >
              {busy === 'waiting' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Undo2 />
              )}
              Back to waiting
            </Button>
          ) : null}
        </>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            disabled={busy !== null}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice and its line items. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
