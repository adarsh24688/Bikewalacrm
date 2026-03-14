"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface AllowedUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  profile?: UserProfile | null;
}

const ROLES = ["super_admin", "manager", "sales_rep"];

export default function TeamSettingsPage() {
  const { fetch: apiFetch, session, isReady } = useApi();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("sales_rep");
  const [addLoading, setAddLoading] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AllowedUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const isSuperAdmin = session?.user?.role === "super_admin";

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<AllowedUser[]>("/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchUsers();
  }, [fetchUsers, isReady]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddUser = async () => {
    if (!addEmail.trim()) return;

    try {
      setAddLoading(true);
      clearMessages();
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ email: addEmail.trim().toLowerCase(), role: addRole }),
      });
      setAddDialogOpen(false);
      setAddEmail("");
      setAddRole("sales_rep");
      showSuccess("User added successfully");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditRole = async () => {
    if (!editUser) return;

    try {
      setEditLoading(true);
      clearMessages();
      await apiFetch(`/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: editRole }),
      });
      setEditDialogOpen(false);
      setEditUser(null);
      showSuccess("Role updated successfully");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setEditLoading(false);
    }
  };

  const handleRevoke = async (user: AllowedUser) => {
    if (!confirm(`Are you sure you want to revoke access for ${user.email}?`)) {
      return;
    }

    try {
      clearMessages();
      await apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      showSuccess(`Access revoked for ${user.email}`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  const openEditDialog = (user: AllowedUser) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              You do not have permission to access this page. Only super admins can manage the team.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team Management</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Manage users who can access LeadCRM
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="shrink-0">Add User</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Allowed Users</CardTitle>
          <CardDescription>
            Users who are allowed to sign in to the CRM. Add an email to invite someone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No users found. Add your first team member.</p>
            </div>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Role</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Last Login</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const displayName = user.profile?.name || "Not joined";
                    const status = user.lastLoginAt ? "Active" : "Invited";
                    const isCurrentUser = session?.user?.id === user.id;
                    return (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="py-3 pr-4"><span className="font-medium">{user.email}</span></td>
                        <td className="py-3 pr-4"><span className={user.profile?.name ? "" : "text-muted-foreground italic"}>{displayName}</span></td>
                        <td className="py-3 pr-4"><Badge variant="secondary" className="capitalize">{user.role.replace("_", " ")}</Badge></td>
                        <td className="py-3 pr-4">{user.isActive ? <Badge variant={status === "Active" ? "default" : "outline"}>{status}</Badge> : <Badge variant="destructive">Revoked</Badge>}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatDate(user.lastLoginAt)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} disabled={isCurrentUser}>Edit Role</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleRevoke(user)} disabled={isCurrentUser || !user.isActive}>Revoke</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
              {users.map((user) => {
                const displayName = user.profile?.name || "Not joined";
                const status = user.lastLoginAt ? "Active" : "Invited";
                const isCurrentUser = session?.user?.id === user.id;
                return (
                  <div key={user.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.email}</p>
                        <p className={`text-xs ${user.profile?.name ? "text-muted-foreground" : "text-muted-foreground italic"}`}>{displayName}</p>
                      </div>
                      {user.isActive ? (
                        <Badge variant={status === "Active" ? "default" : "outline"} className="shrink-0">{status}</Badge>
                      ) : (
                        <Badge variant="destructive" className="shrink-0">Revoked</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize">{user.role.replace("_", " ")}</Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} disabled={isCurrentUser}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRevoke(user)} disabled={isCurrentUser || !user.isActive}>Revoke</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Add a new user by email. They will be able to sign in using Google with this email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="add-email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="add-role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addLoading || !addEmail.trim()}>
              {addLoading ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Change the role for {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
