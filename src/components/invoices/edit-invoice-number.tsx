'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { setInvoiceNumber } from '@/server/actions/invoices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** Lets a manager change a finalized invoice's number. */
export function EditInvoiceNumber({
  invoiceId,
  currentNumber,
}: {
  invoiceId: string;
  currentNumber: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentNumber));
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast.error('Enter a whole number greater than 0');
      return;
    }
    setBusy(true);
    const result = await setInvoiceNumber(invoiceId, parsed);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Invoice number updated');
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(String(currentNumber));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Hash />
          Change number
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Change invoice number</DialogTitle>
            <DialogDescription>
              Must be unique within this project. Future invoices will keep
              numbering above the highest one used.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="invoice-number">Number</Label>
            <Input
              id="invoice-number"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
