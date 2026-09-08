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
import { Check, Pencil, Trash2, X } from "lucide-react";
import {
  deleteUser,
  inviteUser,
  listUsersWithRoles,
  updateUserName,
} from "@/lib/users.functions";

type InvitableRole = "developer" | "owner" | "manager";

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

  const m = useMutation({
    mutationFn: () =>
      invite({
        data: {
          email,
          role,
          ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/reset-password`
              : undefined,
        },
      }),
    onSuccess: () => {
      toast.success(t("settings.users.inviteSent"));
      setEmail("");
      setFullName("");
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
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
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">{t("settings.users.email")}</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-name">{t("settings.users.name")}</Label>
              <Input
                id="invite-name"
                value={fullName}
                placeholder={t("settings.users.namePlaceholder")}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5 sm:w-56">
              <Label>{t("settings.users.role")}</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as InvitableRole)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("settings.users.role_owner")}</SelectItem>
                  <SelectItem value="manager">{t("settings.users.role_manager")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!canEdit || m.isPending}>
              {m.isPending ? t("settings.users.sending") : t("settings.users.invite")}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("settings.users.inviteHint")}
          </p>
        </CardContent>
      </Card>

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
                      <td className="py-2">{ROLE_LABEL_KEYS[u.role] ? t(ROLE_LABEL_KEYS[u.role]) : u.role}</td>
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
                              disabled={!canEdit || u.role === "developer" || del.isPending}
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