import InvestorDetailClient from "@/components/admin/InvestorDetailClient";

export default async function AdminInvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvestorDetailClient investorId={id} />;
}
