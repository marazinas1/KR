import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import {
  listContractTemplates,
  upsertContractTemplate,
  deleteContractTemplate,
} from "@/lib/contracts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, Eye, Bold, Italic, Heading1, Heading2,
  List as ListIcon, ListOrdered, Pilcrow,
} from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/brand";
import { useBrandedTitle } from "@/hooks/useBrandedTitle";

export const Route = createFileRoute("/_authenticated/admin/contracts")({
  head: () => ({ meta: [{ title: `Sutartys | ${PLATFORM_NAME}` }] }),
  component: ContractsPage,
});

const VARIABLES: { key: string; labelKey: string }[] = [
  "kliento_vardas",
  "objektas",
  "vieta",
  "nuo",
  "iki",
  "naktys",
  "sveciai",
  "suma",
  "rezervacijos_nr",
  "data",
].map((k) => ({ key: `{{${k}}}`, labelKey: `contracts.vars.${k}` }));

type Template = {
  id: string;
  name: string;
  language: "lt" | "en";
  kind: "rental" | "privacy";
  content: string;
  is_active: boolean;
  created_at: string;
};

const KIND_LABEL_KEYS: Record<string, string> = {
  rental: "contracts.kindRental",
  privacy: "contracts.kindPrivacy",
};

function ContractsPage() {
  const { t: tr } = useTranslation();
  useBrandedTitle(tr("contracts.title"));
  const fetchList = useServerFn(listContractTemplates);
  const upsertFn = useServerFn(upsertContractTemplate);
  const deleteFn = useServerFn(deleteContractTemplate);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => fetchList(),
  });

  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<Template | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contract-templates"] });

  const saveM = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: (_r, vars: any) => {
      toast.success(vars?.id ? tr("contracts.updated") : tr("contracts.created_toast"));
      invalidate();
      setCreating(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("contracts.error")),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success(tr("contracts.deleted")); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("contracts.error")),
  });

  const rows = (q.data as Template[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tr("contracts.title")}</h1>
        <p className="text-sm text-muted-foreground">{tr("contracts.subtitle")}</p>
      </div>

      <section className="rounded-lg border bg-card">
        <header className="p-5 border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{tr("contracts.sectionTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {tr("contracts.sectionDesc")}
              </p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> {tr("contracts.new")}
            </Button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("contracts.name")}</TableHead>
                <TableHead>{tr("contracts.kind")}</TableHead>
                <TableHead>{tr("contracts.language")}</TableHead>
                <TableHead>{tr("contracts.created")}</TableHead>
                <TableHead>{tr("contracts.status")}</TableHead>
                <TableHead className="text-right w-40">{tr("contracts.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{tr("contracts.loading")}</TableCell></TableRow>
              )}
              {!q.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{tr("contracts.empty")}</TableCell></TableRow>
              )}
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm">{KIND_LABEL_KEYS[t.kind] ? tr(KIND_LABEL_KEYS[t.kind]) : t.kind}</TableCell>
                  <TableCell className="uppercase text-xs">{t.language}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString("lt-LT") : "—"}
                  </TableCell>
                  <TableCell>
                    {t.is_active ? (
                      <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">{tr("contracts.active")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">{tr("contracts.inactive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewing(t)} title={tr("contracts.preview")}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(t)} title={tr("contracts.edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => { if (confirm(tr("contracts.confirmDelete", { name: t.name }))) deleteM.mutate(t.id); }}
                        title={tr("contracts.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {(creating || editing) && (
        <TemplateDialog
          key={editing?.id ?? "new"}
          initial={editing}
          open={creating || !!editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={(data) => {
            if (editing) saveM.mutate({ ...data, id: editing.id });
            else saveM.mutate(data);
          }}
          submitting={saveM.isPending}
        />
      )}

      <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}

function TemplateDialog({
  initial, open, onClose, onSubmit, submitting,
}: {
  initial: Template | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; language: "lt" | "en"; kind: "rental" | "privacy"; content: string; is_active: boolean }) => void;
  submitting: boolean;
}) {
  const { t: tr } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [language, setLanguage] = useState<"lt" | "en">(initial?.language ?? "lt");
  const [kind, setKind] = useState<"rental" | "privacy">(initial?.kind ?? "rental");
  const [isActive, setIsActive] = useState(initial?.is_active ?? false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initial?.content ?? "<p></p>",
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => { editor?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertVariable = (key: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(key).run();
  };

  const submit = () => {
    if (!name.trim()) { toast.error(tr("contracts.nameRequired")); return; }
    const content = editor?.getHTML() ?? "";
    onSubmit({ name: name.trim(), language, kind, content, is_active: isActive });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? tr("contracts.editTitle") : tr("contracts.newTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>{tr("contracts.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("contracts.namePlaceholder")} />
            </div>
            <div className="space-y-1">
              <Label>{tr("contracts.kind")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "rental" | "privacy")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">{tr("contracts.kindRental")}</SelectItem>
                  <SelectItem value="privacy">{tr("contracts.kindPrivacy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{tr("contracts.language")}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "lt" | "en")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lt">{tr("contracts.langLt")}</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm">{tr("contracts.activeHint")}</Label>
          </div>

          <div className="space-y-2">
            <Label>{tr("contracts.variables")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono hover:bg-primary hover:text-primary-foreground transition"
                  title={tr(v.labelKey)}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tr("contracts.body")}</Label>
            <EditorToolbar editor={editor} />
            <div className="rounded-md border min-h-[300px] bg-background">
              <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[300px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tr("contracts.cancel")}</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? tr("contracts.saving") : tr("contracts.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const { t: tr } = useTranslation();
  if (!editor) return null;
  const Btn = ({ active, onClick, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted ${active ? "bg-muted text-primary" : "text-foreground"}`}
    >
      {children}
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
      <Btn title={tr("contracts.toolbar.paragraph")} active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow className="h-4 w-4" />
      </Btn>
      <Btn title={tr("contracts.toolbar.h1")} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </Btn>
      <Btn title={tr("contracts.toolbar.h2")} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn title={tr("contracts.toolbar.bold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn title={tr("contracts.toolbar.italic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn title={tr("contracts.toolbar.bulletList")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <ListIcon className="h-4 w-4" />
      </Btn>
      <Btn title={tr("contracts.toolbar.orderedList")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
    </div>
  );
}

function PreviewDialog({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const html = useMemo(() => DOMPurify.sanitize(template?.content ?? ""), [template]);
  return (
    <Dialog open={!!template} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.name}</DialogTitle>
        </DialogHeader>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
    </Dialog>
  );
}