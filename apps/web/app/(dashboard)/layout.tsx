import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { BottomNav } from "@/components/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? { name: "Admin", email: "", role: "super_admin", id: "admin", branchId: null };

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar user={user} />
      <MobileHeader user={user} />
      <main className="flex-1 overflow-y-auto p-4 pt-[calc(3.5rem+env(safe-area-inset-top)+1rem)] pb-[calc(60px+env(safe-area-inset-bottom)+1rem)] md:p-8 md:pt-8 md:pb-8">
        <div className="mx-auto max-w-[1400px]">
          {children}
        </div>
      </main>
      <BottomNav userRole={user.role} />
    </div>
  );
}
