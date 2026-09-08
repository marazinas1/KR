import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/DatePicker";
import { DocumentsTab } from "@/components/admin/units/DocumentsTab";
import {
  getTenant,
  inviteTenantToPortal,
  revokeTenantPortal,
  saveTenant,
  saveTenantIdentity,
} from "@/lib/tenants.functions";
import { listLeases } from "@/lib/leases.functions";

export const Route = createFileRoute("/_authenticated/admin/tenants/$id")({
  component: TenantDetail,
  head: () => ({
    meta: [
      { title: "Nuomininko kortelė — nuomos administravimas" },
      {
        name: "description",
        content: "Nuomininko kontaktai, sutartys ir dokumentai vienoje vietoje.",
      },
    ],
  }),
});

function TenantDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const fetchTenant = useServerFn(getTenant);
  const save = useServerFn(saveTenant);
  const saveIdentity = useServerFn(saveTenantIdentity);
  const fetchLeases = useServerFn(listLeases);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => fetchTenant({ data: { id } }),
  });
  const { data: leases = [] } = useQuery({
    queryKey: ["tenant-leases", id],
    queryFn: () => fetchLeases({ data: { tenant_id: id } }),
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
    is_active: true,
  });
  const [identity, setIdentity] = useState({
    personal_code: "",
    id_doc_type: "",
    id_doc_number: "",
    issued_by: "",
    valid_until: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      first_name: data.tenant.first_name,
      last_name: data.tenant.last_name,
      phone: data.tenant.phone,
      email: data.tenant.email,
      notes: data.tenant.notes,
      is_active: data.tenant.is_active,
    });
    if (data.identity) {
      setIdentity({
        personal_code: data.identity.personal_code ?? "",
        id_doc_type: data.identity.id_doc_type ?? "",
        id_doc_number: data.identity.id_doc_number ?? "",
        issued_by: data.identity.issued_by ?? "",
        valid_until: data.identity.valid_until ?? "",
      });
    }
  }, [data]);

  const saveMain = useMutation({
    mutationFn: () => save({ data: { id, ...form } }),
    onSuccess: () => {
      toast.success(t("rental.tenants.saved"));
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveId = useMutation({
    mutationFn: () =>
      saveIdentity({ data: { tenant_id: id, ...identity, valid_until: identity.valid_until || null } }),
    onSuccess: () => toast.success(t("rental.tenants.identitySaved")),
    onError: (e: Error) => toast.error(e.message),
  });
  const inviteFn = useServerFn(inviteTenantToPortal);
  const revokeFn = useServerFn(revokeTenantPortal);
  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { tenant_id: id, redirectTo: window.location.origin } }),
    onSuccess: () => {
      toast.success(t("rental.tenants.inviteSent"));
      refetch();
    },
    onError: (e: Error) =>
      toast.error(
        e.message === "NoEmail"
          ? t("rental.tenants.inviteNoEmail")
          : e.message === "EmailUsedByOtherTenant"
            ? t("rental.tenants.inviteEmailClash")
            : e.message,
      ),
  });
  const revoke = useMutation({
    mutationFn: () => revokeFn({ data: { tenant_id: id } }),
    onSuccess: () => {
      toast.success(t("rental.tenants.revoked"));
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  return (
    <div>
      <Link to="/admin/tenants" className="inline-flex items-center text-sm text-muted-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t("rental.tenants.title")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        {data.tenant.first_name} {data.tenant.last_name}
      </h1>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {data.tenant.user_id ? t("rental.tenants.hasLogin") : t("rental.tenants.noLogin")}
        </p>
        {data.canInvite && !data.tenant.user_id && (
          <Button size="sm" variant="outline" disabled={invite.isPending} onClick={() => invite.mutate()}>
            {t("rental.tenants.invitePortal")}
          </Button>
        )}
        {data.canInvite && data.tenant.user_id && (
          <>
            <Button size="sm" variant="outline" disabled={invite.isPending} onClick={() => invite.mutate()}>
              {t("rental.tenants.resendInvite")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={revoke.isPending}
              onClick={() => {
                if (confirm(t("rental.tenants.revokeConfirm"))) revoke.mutate();
              }}
            >
              {t("rental.tenants.revokePortal")}
            </Button>
          </>
        )}
        {!data.canInvite && !data.tenant.user_id && (
          <p className="text-xs text-muted-foreground">{t("rental.tenants.inviteNotPrimary")}</p>
        )}
      </div>

      <Tabs defaultValue="details" className="mt-5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">{t("rental.tenants.tabDetails")}</TabsTrigger>
          <TabsTrigger value="leases">{t("rental.tenants.tabLeases")}</TabsTrigger>
          <TabsTrigger value="documents">{t("rental.tabs.documents")}</TabsTrigger>
          {data.canSeeIdentity && (
            <TabsTrigger value="identity">{t("rental.tenants.tabIdentity")}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <form
            className="grid max-w-2xl gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMain.mutate();
            }}
          >
            <div>
              <Label htmlFor="d-first">{t("rental.tenants.fFirstName")}</Label>
              <Input
                id="d-first"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="d-last">{t("rental.tenants.fLastName")}</Label>
              <Input
                id="d-last"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="d-phone">{t("rental.tenants.colPhone")}</Label>
              <Input
                id="d-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="d-email">{t("rental.tenants.colEmail")}</Label>
              <Input
                id="d-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="d-notes">{t("rental.tenants.fNotes")}</Label>
              <Textarea
                id="d-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="d-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="d-active">{t("rental.tenants.fActive")}</Label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saveMain.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="leases" className="mt-4">
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rental.lease.noHistory")}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {leases.map((l) => (
                <li key={l.id} className="p-3 text-sm">
                  <Link
                    to="/admin/units/$id"
                    params={{ id: l.unit_id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {l.unit_name}
                  </Link>{" "}
                  · {l.start_date} — {l.end_date ?? t("rental.lease.openEnded")} ·{" "}
                  {l.monthly_rent.toFixed(2)} € · {t(`rental.leaseStatus.${l.status}`)}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab tenantId={id} />
        </TabsContent>

        {data.canSeeIdentity && (
          <TabsContent value="identity" className="mt-4">
            <p className="mb-3 text-xs text-muted-foreground">
              {t("rental.tenants.identityHint")}
            </p>
            <form
              className="grid max-w-2xl gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveId.mutate();
              }}
            >
              <div>
                <Label htmlFor="i-code">{t("rental.tenants.fPersonalCode")}</Label>
                <Input
                  id="i-code"
                  value={identity.personal_code}
                  onChange={(e) => setIdentity({ ...identity, personal_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="i-type">{t("rental.tenants.fDocType")}</Label>
                <Input
                  id="i-type"
                  value={identity.id_doc_type}
                  onChange={(e) => setIdentity({ ...identity, id_doc_type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="i-num">{t("rental.tenants.fDocNumber")}</Label>
                <Input
                  id="i-num"
                  value={identity.id_doc_number}
                  onChange={(e) => setIdentity({ ...identity, id_doc_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="i-issued">{t("rental.tenants.fIssuedBy")}</Label>
                <Input
                  id="i-issued"
                  value={identity.issued_by}
                  onChange={(e) => setIdentity({ ...identity, issued_by: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("rental.tenants.fValidUntil")}</Label>
                <DatePicker
                  value={identity.valid_until}
                  onChange={(v) => setIdentity({ ...identity, valid_until: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saveId.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
