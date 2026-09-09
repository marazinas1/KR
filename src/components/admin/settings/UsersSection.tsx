import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Loader2, Pencil, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  approveDeveloperInvite,
  deleteUser,
  inviteUser,
  listDeveloperInvites,
  listUsersWithRoles,
  rejectDeveloperInvite,
  updateUserName,
  updateUserRole,
} from "@/lib/users.functions";
import { getMyRole } from "@/lib/properties.functions";

type InvitableRole = "developer" | "owner" | "manager";
type AssignableRole = "owner" | "manager" | "tenant";

const ROLE_LABEL_KEYS: Record<string, string> = {
  developer: "settings.users.role_developer",
  owner: "settings.users.role_owner",
  manager: "settings.users.role_manager",
  tenant: "settings.users.role_tenant",
};


function fmt(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  return withTime
    ? d.toLocaleString("lt-LT", { hour12: false })
    : d.toLocaleDateString("lt-LT");
}

export function UsersSection({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const invite = useServerFn(inviteUser);
  const fetchUsers = useServerFn(listUsersWithRoles);
  const removeUser = useServerFn(deleteUser);
  const renameUser = useServerFn(updateUserName);
  const changeRole = useServerFn(updateUserRole);
  const fetchInvites = useServerFn(listDeveloperInvites);
  const approveInvite = useServerFn(approveDeveloperInvite);
  const rejectInvite = useServerFn(rejectDeveloperInvite);
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<InvitableRole>("manager");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: () => fetchUsers(),
  });

  // Only a developer may propose another developer (AGENTS.md 5.2).
  const fetchMyRole = useServerFn(getMyRole);
  const { data: myRole } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchMyRole(),
  });
  const isDeveloper = myRole?.isDeveloper === true;
  const myUserId = myRole?.userId ?? "";

  const { data: invites } = useQuery({
    queryKey: ["developer-invites"],
    queryFn: () => fetchInvites(),
    enabled: isDeveloper,
  });

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

  const m = useMutation({
    mutationFn: () =>
      invite({
        data: {
          email,
          role,
          ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
          redirectTo,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res && (res as { pending?: boolean }).pending
          ? t("settings.users.devInvitePending")
          : t("settings.users.inviteSent"),
      );
      setEmail("");
      setFullName("");
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      qc.invalidateQueries({ queryKey: ["developer-invites"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.users.inviteFailed")),
  });

  const rename = useMutation({
    mutationFn: (vars: { userId: string; fullName: string }) => renameUser({ data: vars }),
    onSuccess: () => {
      toast.success(t("settings.users.nameSaved"));
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const roleChange = useMutation({
    mutationFn: (vars: { userId: string; role: AssignableRole }) => changeRole({ data: vars }),
    onSuccess: () => {
      toast.success(t("settings.users.roleSaved"));
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const approve = useMutation({
    mutationFn: (inviteId: string) => approveInvite({ data: { inviteId, redirectTo } }),
    onSuccess: (res) => {
      toast.success(
        res && (res as { approved?: boolean }).approved
          ? t("settings.users.inviteSent")
          : t("settings.users.devInviteApproved"),
      );
      qc.invalidateQueries({ queryKey: ["developer-invites"] });
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const reject = useMutation({
    mutationFn: (inviteId: string) => rejectInvite({ data: { inviteId } }),
    onSuccess: () => {
      toast.success(t("settings.users.devInviteRejected"));
      qc.invalidateQueries({ queryKey: ["developer-invites"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const del = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: () => {
      toast.success(t("settings.users.deleted"));
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.users.deleteFailed")),
  });


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.users.inviteTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <div>
              <Label className="flex h-5 items-end" htmlFor="invite-email">
                {t("settings.users.email")}
              </Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canEdit}
                className="mt-1.5 h-10"
              />
            </div>
            <div>
              <Label className="flex h-5 items-end" htmlFor="invite-name">
                {t("settings.users.name")}
              </Label>
              <Input
                id="invite-name"
                value={fullName}
                placeholder={t("settings.users.namePlaceholder")}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!canEdit}
                className="mt-1.5 h-10"
              />
            </div>
            <div>
              <Label className="flex h-5 items-end">{t("settings.users.role")}</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as InvitableRole)}
                disabled={!canEdit}
              >
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isDeveloper && (
                    <SelectItem value="developer">
                      {t("settings.users.role_developer")}
                    </SelectItem>
                  )}
                  <SelectItem value="owner">{t("settings.users.role_owner")}</SelectItem>
                  <SelectItem value="manager">{t("settings.users.role_manager")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="h-10" type="submit" disabled={!canEdit || m.isPending}>
              {m.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {m.isPending ? t("settings.users.sending") : t("settings.users.invite")}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("settings.users.inviteHint")}
          </p>
        </CardContent>
      </Card>

      {isDeveloper && (invites ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.users.devInvitesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("settings.users.devInvitesHint")}</p>
            {(invites ?? []).map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inv.fullName || inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.email} · {t("settings.users.devInviteApprovals", {
                      count: inv.approvals,
                      total: inv.totalDevelopers,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    disabled={inv.approvedByMe || approve.isPending}
                    onClick={() => approve.mutate(inv.id)}
                  >
                    {inv.approvedByMe
                      ? t("settings.users.devInviteApprovedByMe")
                      : t("settings.users.devInviteApprove")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(inv.id)}
                  >
                    {t("settings.users.devInviteReject")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}



      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.users.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("settings.users.loading")}</p>
          ) : (users ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("settings.users.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 font-medium">{t("settings.users.name")}</th>
                    <th className="py-2 font-medium">{t("settings.users.email")}</th>
                    <th className="py-2 font-medium">{t("settings.users.role")}</th>
                    <th className="py-2 font-medium">{t("settings.users.colAdded")}</th>
                    <th className="py-2 font-medium">{t("settings.users.colLastSignIn")}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={`${u.userId}-${u.role}`} className="border-t">
                      <td className="py-2">
                        {editingId === u.userId ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-8 w-40"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={t("settings.users.saveName")}
                              disabled={rename.isPending}
                              onClick={() =>
                                rename.mutate({ userId: u.userId, fullName: editingName.trim() })
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={t("common.cancel")}
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{u.fullName || u.email || u.userId}</span>
                            {canEdit && u.role !== "developer" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={t("settings.users.editName")}
                                onClick={() => {
                                  setEditingId(u.userId);
                                  setEditingName(u.fullName || "");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2">{u.email || u.userId}</td>
                      <td className="py-2">
                        {u.role === "developer" || u.userId === myUserId || !canEdit ? (
                          <Badge variant="outline" className="gap-1 font-medium">
                            <ShieldCheck className="h-3 w-3" />
                            {ROLE_LABEL_KEYS[u.role] ? t(ROLE_LABEL_KEYS[u.role]) : u.role}
                          </Badge>
                        ) : (
                          <Select
                            value={u.role}
                            disabled={roleChange.isPending}
                            onValueChange={(v) =>
                              roleChange.mutate({ userId: u.userId, role: v as AssignableRole })
                            }
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">{t("settings.users.role_owner")}</SelectItem>
                              <SelectItem value="manager">{t("settings.users.role_manager")}</SelectItem>
                              <SelectItem value="tenant">{t("settings.users.role_tenant")}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">{fmt(u.createdAt)}</td>
                      <td className="py-2 text-muted-foreground">
                        {u.lastSignInAt ? fmt(u.lastSignInAt, true) : t("settings.users.neverSignedIn")}
                      </td>
                      <td className="py-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={
                                !canEdit ||
                                del.isPending ||
                                (u.role === "developer" && u.userId !== myUserId) ||
                                (u.role !== "developer" && u.userId === myUserId)
                              }
                              aria-label={t("settings.users.deleteAria")}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("settings.users.deleteTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("settings.users.deleteDesc", {
                                  name: u.fullName || u.email || u.userId,
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(u.userId)}>
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}