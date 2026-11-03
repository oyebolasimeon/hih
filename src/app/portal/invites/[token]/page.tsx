import InviteAcceptClient from "@/components/portal/InviteAcceptClient";

type PageProps = { params: Promise<{ token: string }> };

export default async function TenantInvitePage({ params }: PageProps) {
  const { token } = await params;
  return (
    <div className="px-4 sm:px-6 py-8">
      <InviteAcceptClient token={token} />
    </div>
  );
}
