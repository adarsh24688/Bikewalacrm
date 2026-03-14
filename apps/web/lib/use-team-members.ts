"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "./hooks";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useTeamMembers() {
  const { fetch: apiFetch, isReady } = useApi();
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!isReady) return;
    apiFetch<TeamMember[]>("/team-members")
      .then(setMembers)
      .catch(() => {});
  }, [apiFetch, isReady]);

  const getMemberName = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "Unassigned";
      const member = members.find((m) => m.id === id);
      return member ? member.name : "Unassigned";
    },
    [members]
  );

  return { members, getMemberName };
}
