import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <div className="flex h-full w-full overflow-hidden">
          <Sidebar />
          <div className="flex w-full flex-1 flex-col">
              <main className="flex-1 overflow-y-auto p-6">
                  {children}
              </main>
          </div>
      </div>
  );
}


