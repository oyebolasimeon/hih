import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import SiteContentAdminClient from "@/components/admin/SiteContentAdminClient";
import BlogAdminClient from "@/components/admin/cms/BlogAdminClient";
import FaqAdminClient from "@/components/admin/cms/FaqAdminClient";
import TestimonialsAdminClient from "@/components/admin/cms/TestimonialsAdminClient";

export default async function AdminSiteContentPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "content:read")) {
    redirect("/admin");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Website CMS
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Manage public website surfaces — blog, FAQ, testimonials, and auth-
          page content.
        </p>
      </div>

      <section className="space-y-6">
        <BlogAdminClient />
      </section>

      <section className="border-t border-border pt-8 space-y-6">
        <FaqAdminClient />
      </section>

      <section className="border-t border-border pt-8 space-y-6">
        <TestimonialsAdminClient />
      </section>

      <section className="border-t border-border pt-8 space-y-6">
        <h2 className="text-lg font-display font-semibold">Auth & login surfaces</h2>
        <SiteContentAdminClient />
      </section>
    </div>
  );
}
