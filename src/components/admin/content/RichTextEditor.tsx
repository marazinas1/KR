import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading2, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  invalid,
  onEditorReady,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[180px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    onEditorReady?.(editor ?? null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return <div className="h-[220px] rounded-md border bg-muted/30" aria-hidden />;
  }

  return (
    <div
      className={`overflow-hidden rounded-md border bg-background ${
        invalid ? "border-destructive" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-1.5 py-1">
        <ToolbarButton
          label={t("content.ui.editor.bold")}
          disabled={disabled}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("content.ui.editor.italic")}
          disabled={disabled}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("content.ui.editor.heading")}
          disabled={disabled}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("content.ui.editor.bulletList")}
          disabled={disabled}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("content.ui.editor.orderedList")}
          disabled={disabled}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            label={t("content.ui.editor.undo")}
            disabled={disabled}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label={t("content.ui.editor.redo")}
            disabled={disabled}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}