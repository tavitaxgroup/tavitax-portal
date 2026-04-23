"use client";

import { useEffect, useState } from "react";
import { Clock, FileText, Newspaper, FolderArchive, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/activity');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Failed to fetch activities", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getIcon = (type: string, colorClass: string) => {
    switch (type) {
      case 'crm': return <FileText size={18} className={colorClass} />;
      case 'news': return <Newspaper size={18} className={colorClass} />;
      case 'docs': return <FolderArchive size={18} className={colorClass} />;
      default: return <Clock size={18} className={colorClass} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/50 transition-colors h-full flex flex-col min-h-[300px]"
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Bảng Hoạt động Gần đây</h3>
        <button 
          onClick={fetchActivities}
          className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700"
        >
          Làm mới
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center items-center h-full text-slate-400">
             <Loader2 size={24} className="animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-slate-400 pt-10">
             Chưa có hoạt động nào được ghi nhận.
          </div>
        ) : (
          <div className="relative">
            {/* Đường kẻ dọc timeline */}
            <div className="absolute left-6 top-2 bottom-2 w-[2px] bg-slate-100 dark:bg-slate-700"></div>

            <div className="space-y-8 relative pb-4">
              {activities.map((activity, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  key={activity.id + "-" + index} 
                  className="flex items-start gap-5"
                >
                  <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${activity.bgStyle}`}>
                    {getIcon(activity.type, activity.iconColor)}
                  </div>
                  <div className="pt-1">
                    <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base">
                      <span className="font-bold text-slate-900 dark:text-white mr-1">{activity.user}</span>
                      {activity.action}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 dark:text-slate-500 text-xs font-medium">
                      <Clock size={12} />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
