import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { verifyToken } from "@/lib/auth";

export default async function QuoteGuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;

  let hasAccess = false;
  
  if (token) {
    try {
      const user = verifyToken(token);
      if (user.permissions?.includes('quote')) {
        hasAccess = true;
      }
    } catch(e) {}
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-12 text-center max-w-lg">
          <div className="bg-rose-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
            <ShieldAlert size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Truy Cập Bị Từ Chối</h2>
          <p className="text-slate-500">
            Tài khoản của bạn không được cấp quyền để sử dụng công cụ Báo giá & Hợp đồng. Vui lòng liên hệ với Quản trị viên hệ thống.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
