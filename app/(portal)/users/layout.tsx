import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";

export default async function UsersGuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;

  let hasAccess = false;
  
  if (token) {
    try {
      const user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      if (user.permissions?.includes('users')) {
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
            Chỉ Quản trị viên cấp cao mới có quyền Quản lý Nhân sự & Phân quyền ứng dụng.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
