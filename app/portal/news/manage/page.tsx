"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Pencil, Trash2, PlusCircle, Search } from "lucide-react";

export default function ManageNews() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      setArticles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN bài báo: "${title}"?`)) return;
    
    try {
      setArticles(articles.filter(a => a.id !== id)); // Optimistic UI
      await fetch(`/api/news/${id}`, { method: "DELETE" });
    } catch (err) {
      alert("Lỗi khi xoá bài!");
      fetchArticles(); // Rollback if error
    }
  };

  // Logic lọc và sắp xếp
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (searchQuery && searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.trim().toLowerCase();
      result = result.filter(article => 
        String(article.title).toLowerCase().includes(lowerQuery) || 
        String(article.id).toLowerCase().includes(lowerQuery)
      );
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [searchQuery, sortOrder, articles]);

  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 rounded-3xl p-8 text-white shadow-xl mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold mb-2">Kho Bài Viết (CMS)</h1>
            <p className="text-slate-300">Quản lý, chỉnh sửa, hoặc xoá các bài báo đã đăng</p>
          </div>
          <Link href="/portal/news" className="bg-primary-600 hover:bg-primary-500 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors">
            <PlusCircle size={20} /> Viết Bài Mới
          </Link>
        </div>

        {/* Thanh Tìm Kiếm & Sắp Xếp */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề hoặc ID..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset page on search
              }}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm shrink-0">
            <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Sắp xếp:</span>
            <select
              className="bg-transparent focus:outline-none text-slate-900 font-medium cursor-pointer"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as any);
                setCurrentPage(1); // Reset page on sort
              }}
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          {loading ? (
            <p className="text-center font-bold text-slate-500 py-10">Đang tải dữ liệu báo chí...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-500">
                    <th className="py-4 px-4 font-bold">ID</th>
                    <th className="py-4 px-4 font-bold w-1/2">Tiêu đề bài viết</th>
                    <th className="py-4 px-4 font-bold hidden md:table-cell">Ngày đăng</th>
                    <th className="py-4 px-4 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArticles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((article) => (
                    <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-400">#{article.id}</td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        <Link href={`/news/${article.slug}`} target="_blank" className="hover:text-primary-600 hover:underline">
                          {article.title}
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-500 hidden md:table-cell">
                        {new Date(article.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/portal/news?edit=${article.id}`} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                            <Pencil size={18} />
                          </Link>
                          <button onClick={() => deleteArticle(article.id, article.title)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredArticles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500 font-medium">
                        Không tìm thấy bài viết nào phù hợp!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Thanh Phân Trang */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-500 disabled:opacity-50 hover:bg-slate-50"
                >
                  Trước
                </button>
                <span className="font-medium text-slate-600 px-4">
                  Trang {currentPage} / {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-500 disabled:opacity-50 hover:bg-slate-50"
                >
                  Sau
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
