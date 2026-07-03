'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
/* eslint-disable @next/next/no-img-element */
import { Eraser, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import { createSignatureUploadUrl } from '@/server/actions/uploads';
import { Button } from '@/components/ui/button';

async function uploadSignature(blob: Blob, contentType: string) {
  const { uploadUrl, publicUrl } = await createSignatureUploadUrl({
    contentType,
  });
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return publicUrl;
}

export function SignatureManager({
  organizationId,
  canManage,
  signatureImageUrl,
}: {
  organizationId: string;
  canManage: boolean;
  signatureImageUrl: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [mode, setMode] = useState<'idle' | 'draw'>('idle');
  const [busy, setBusy] = useState(false);

  async function persist(url: string | null) {
    setBusy(true);
    const { error } = await authClient.organization.update({
      organizationId,
      data: { signatureImageUrl: url ?? '' },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? 'Could not update signature');
      return;
    }
    toast.success(url ? 'Signature saved' : 'Signature removed');
    setMode('idle');
    router.refresh();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSignature(file, file.type);
      await persist(url);
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // --- canvas drawing ---
  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    dirty.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function end() {
    drawing.current = false;
  }
  function clearCanvas() {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
  }

  async function saveDrawing() {
    const c = canvasRef.current;
    if (!c || !dirty.current) {
      toast.error('Draw a signature first.');
      return;
    }
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        c.toBlob(resolve, 'image/png'),
      );
      if (!blob) throw new Error('Could not read drawing');
      const url = await uploadSignature(blob, 'image/png');
      await persist(url);
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-56 items-center justify-center rounded-md border bg-muted/30">
          {signatureImageUrl ? (
            <img
              src={signatureImageUrl}
              alt="Signature"
              className="max-h-20 max-w-52 object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">No signature</span>
          )}
        </div>
        {canManage && signatureImageUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => persist(null)}
          >
            <Trash2 />
            Remove
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}
              Upload image
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setMode((m) => (m === 'draw' ? 'idle' : 'draw'))}
            >
              {mode === 'draw' ? 'Close pad' : 'Draw signature'}
            </Button>
          </div>

          {mode === 'draw' ? (
            <div className="grid gap-2">
              <canvas
                ref={canvasRef}
                width={448}
                height={160}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className="touch-none rounded-md border bg-white"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={clearCanvas}
                >
                  <Eraser />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={saveDrawing}
                >
                  {busy && <Loader2 className="animate-spin" />}
                  Save drawing
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
