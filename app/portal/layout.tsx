import { cookies } from "next/headers";
import { LoginForm } from "@/components/portal/LoginForm";
import { AdminTopbar } from "@/components/portal/AdminTopbar";
import { AdminSidebar } from "@/components/portal/AdminSidebar";
import { SessionKeepAlive } from "@/components/portal/SessionKeepAlive";
import { ThemeProvider } from "@/components/portal/ThemeProvider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;

  if (!token) {
    return <LoginForm />;
  }

  let user = null;
  try {
    user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch (e) {
    return <LoginForm />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
        <SessionKeepAlive />
        {/* Sidebar - fixed left */}
        <AdminSidebar user={user} />
        
        {/* Main Content wrapper */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Topbar */}
          <AdminTopbar user={user} />
          
          {/* Scrollable Main Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 z-0">
            {children}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
