"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function SessionKeepAlive() {
  const router = useRouter();
  const lastActivity = useRef<number>(Date.now());
  const lastRefresh = useRef<number>(Date.now());

  useEffect(() => {
    // Update last activity timestamp on user interaction
    const updateActivity = () => {
      lastActivity.current = Date.now();
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    // Check periodically if we should refresh the session or if it has expired
    const interval = setInterval(async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity.current;
      const timeSinceRefresh = now - lastRefresh.current;

      // If user has been inactive for more than 1 hour (3600000 ms), force reload to show login
      if (timeSinceActivity >= 60 * 60 * 1000) {
        window.location.reload();
        return;
      }

      // If user is active and we haven't refreshed in 10 minutes (600000 ms)
      if (timeSinceActivity < 10 * 60 * 1000 && timeSinceRefresh >= 10 * 60 * 1000) {
        try {
          const res = await fetch("/api/auth/refresh", { method: "POST" });
          if (res.ok) {
            lastRefresh.current = now;
          } else {
            // Token might be dead, force reload
            window.location.reload();
          }
        } catch (e) {
          console.error("Failed to refresh session");
        }
      }
    }, 60 * 1000); // Check every minute

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      clearInterval(interval);
    };
  }, []);

  return null;
}
