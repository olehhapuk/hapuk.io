import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-semibold tracking-tight">
          hapuk<span className="text-muted-foreground">.io</span>
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
