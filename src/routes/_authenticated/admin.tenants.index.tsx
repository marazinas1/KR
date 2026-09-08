import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listTenants, saveTenant } from "@/lib/tenants.functions";

export const Route = createFileRoute("/_authenticated/admin/tenants/")({
  component: TenantsPage,
  head: () => ({
    meta: [
      { title: "Nuomininkai — nuomos administravimas" },
      {
        name: "description",
        content: "Nuomininkų sąrašas su kontaktais, butu ir portalo prieigos būsena.",
      },
    ],
  }),
});

function TenantsPage() {
  const { t } = useTranslation();
  const fetchTenants = useServerFn(listTenants);
  const save = useServerFn(saveTenant);
  const { data: tenants = [], refetch, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => fetchTenants(),
  });

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
    is_active: true,
  });

  const create = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success(t("rental.tenants.saved"));
      setOpen(false);
      setForm({ first_name: "", last_name: "", phone: "", email: "", notes: "", is_active: true });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tenants;
    return tenants.filter((x) =>
      [x.first_name, x.last_name, x.phone, x.email, x.unit_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [tenants, q]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t("rental.tenants.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("rental.tenants.count", { count: rows.length })}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("rental.tenants.new")}
        </Button>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={t("rental.tenants.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2">{t("rental.tenants.colName")}</th>
              <th className="p-2">{t("rental.tenants.colPhone")}</th>
              <th className="p-2">{t("rental.tenants.colEmail")}</th>
              <th className="p-2">{t("rental.tenants.colUnit")}</th>
              <th className="p-2">{t("rental.tenants.colLogin")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-3 text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-muted-foreground">
                  {t("rental.tenants.empty")}
                </td>
              </tr>
            )}
            {rows.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-2">
                  <Link
                    to="/admin/tenants/$id"
                    params={{ id: x.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {x.first_name} {x.last_name}
                  </Link>
                </td>
                <td className="p-2">{x.phone || "—"}</td>
                <td className="p-2">{x.email || "—"}</td>
                <td className="p-2">
                  {x.unit_id ? (
                    <Link to="/admin/units/$id" params={{ id: x.unit_id }} className="hover:underline">
                      {x.unit_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  {x.has_login ? t("rental.tenants.hasLogin") : t("rental.tenants.noLogin")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rental.tenants.new")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div>
              <Label htmlFor="t-first">{t("rental.tenants.fFirstName")}</Label>
              <Input
                id="t-first"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="t-last">{t("rental.tenants.fLastName")}</Label>
              <Input
                id="t-last"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="t-phone">{t("rental.tenants.colPhone")}</Label>
              <Input
                id="t-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="t-email">{t("rental.tenants.colEmail")}</Label>
              <Input
                id="t-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="t-notes">{t("rental.tenants.fNotes")}</Label>
              <Textarea
                id="t-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
