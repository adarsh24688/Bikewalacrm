"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback, useMemo } from "react";
import { apiFetch, apiUpload, ApiError } from "./api";

export function useApi() {
  const { data: session, status } = useSession();

  // Extract token as a primitive string so useCallback dependency comparison is reliable
  const token = useMemo(
    () => (session as any)?.accessToken as string | undefined,
    [session]
  );

  const isReady = status === "authenticated" && !!token;

  const fetch = useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> => {
      if (!token) {
        throw new ApiError("Not authenticated", 401);
      }
      try {
        return await apiFetch<T>(path, { ...options, token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          signOut({ callbackUrl: "/login" });
        }
        throw err;
      }
    },
    [token]
  );

  const upload = useCallback(
    async <T>(path: string, file: File): Promise<T> => {
      if (!token) {
        throw new ApiError("Not authenticated", 401);
      }
      try {
        return await apiUpload<T>(path, file, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          signOut({ callbackUrl: "/login" });
        }
        throw err;
      }
    },
    [token]
  );

  return { fetch, upload, session, isReady };
}
