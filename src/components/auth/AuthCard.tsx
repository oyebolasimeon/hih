import Link from "next/link";

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-[linear-gradient(160deg,#f8f9fa_0%,#eef5d8_45%,#f8f9fa_100%)] dark:bg-[linear-gradient(160deg,#0f1115_0%,#1a2210_50%,#0f1115_100%)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-brand rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Nova Elite Homes"
              className="h-7 w-7 rounded-sm object-contain"
            />
            <span className="text-base font-semibold text-foreground tracking-tight">
              Nova Elite Homes
            </span>
          </Link>
        </div>
        <div className="app-card p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-serif font-semibold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
