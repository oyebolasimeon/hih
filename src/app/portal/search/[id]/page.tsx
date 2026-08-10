import ListingDetailClient from "@/components/portal/ListingDetailClient";

export default async function PortalSearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingDetailClient id={id} />;
}
