"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FormSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type InvitePayload = {
  id: string;
  status: string;
  tenantName: string;
  tenantEmail: string;
  rentAmount: number;
  currency: string;
  paymentPeriod: string;
  startDate: string;
  endDate: string | null;
  notes: string;
  expiresAt: string;
  leaseId: string | null;
  landlordName: string;
  listing: {
    id: string;
    title: string;
    city: string;
    state: string;
    street: string;
    imageUrl: string | null;
  } | null;
};

export default function InviteAcceptClient({ token }: { token: string }) {
  const { data: session, status: authStatus } = useSession();
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/portal/tenants/invites/${encodeURIComponent(token)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load invitation.");
      setInvite(null);
      return;
    }
    setInvite(data.invite);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept() {
    setAccepting(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/tenants/invites/${encodeURIComponent(token)}`, {
      method: "POST",
    });
    const data = await res.json();
    setAccepting(false);
    if (!res.ok) {
      setError(data.error || "Could not accept invitation.");
      return;
    }
    setMessage(
      "Invitation accepted. Review and sign your agreement to activate the tenancy."
    );
    await load();
  }

  if (loading || authStatus === "loading") return <FormSkeleton />;

  if (error && !invite) {
    return (
      <EmptyState title="Invitation unavailable" description={error}>
        <Link href="/portal" className="app-btn app-btn-primary text-sm">
          Go to portal
        </Link>
      </EmptyState>
    );
  }

  if (!invite) return null;

  const loggedIn = Boolean(session?.user);
  const alreadyAccepted = invite.status === "accepted";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
          Tenant invitation
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold">
          Join your tenancy on House In Hands
        </h1>
        <p className="mt-2 text-sm text-muted">
          {invite.landlordName} invited you to manage rent, documents and
          maintenance for your current home digitally.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      <div className="app-card overflow-hidden">
        {invite.listing?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={invite.listing.imageUrl}
            alt=""
            className="h-44 w-full object-cover"
          />
        ) : null}
        <div className="p-5 sm:p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">
            {invite.listing?.title || "Property"}
          </h2>
          <p className="text-sm text-muted">
            {[invite.listing?.street, invite.listing?.city, invite.listing?.state]
              .filter(Boolean)
              .join(", ")}
          </p>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm pt-2">
            <div>
              <dt className="text-xs text-muted">Tenant</dt>
              <dd className="font-medium">{invite.tenantName}</dd>
              <dd className="text-xs text-muted">{invite.tenantEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Rent</dt>
              <dd className="font-medium">
                {invite.currency} {invite.rentAmount.toLocaleString()} /{" "}
                {invite.paymentPeriod}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Lease start</dt>
              <dd className="font-medium">
                {new Date(invite.startDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Lease end</dt>
              <dd className="font-medium">
                {invite.endDate
                  ? new Date(invite.endDate).toLocaleDateString()
                  : "Open / to confirm"}
              </dd>
            </div>
          </dl>
          {invite.notes ? (
            <p className="text-sm text-muted border-t border-border pt-3">
              {invite.notes}
            </p>
          ) : null}

          <div className="pt-4 flex flex-wrap gap-3">
            {!loggedIn ? (
              <>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/portal/invites/${token}`)}`}
                  className="app-btn app-btn-primary text-sm"
                >
                  Sign in to accept
                </Link>
                <Link
                  href={`/register?callbackUrl=${encodeURIComponent(`/portal/invites/${token}`)}`}
                  className="app-btn app-btn-secondary text-sm"
                >
                  Create account
                </Link>
              </>
            ) : alreadyAccepted ? (
              <Link href="/portal/agreements" className="app-btn app-btn-primary text-sm">
                Open agreements
              </Link>
            ) : (
              <button
                type="button"
                disabled={accepting}
                onClick={() => void accept()}
                className="app-btn app-btn-primary text-sm"
              >
                {accepting ? "Accepting…" : "Accept invitation"}
              </button>
            )}
          </div>
          <p className="text-xs text-muted">
            Expires {new Date(invite.expiresAt).toLocaleString()}. Use the email
            address this invite was sent to ({invite.tenantEmail}).
          </p>
        </div>
      </div>
    </div>
  );
}
