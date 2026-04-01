import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Link as LinkIcon } from "lucide-react";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors ${active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false }) as any,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }) as any,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm prose-invert max-w-none min-h-[80px] px-3 py-2 outline-none text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1 [&_a]:text-primary [&_a]:underline",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("URL do link:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/50 bg-secondary/50">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("orderedList")} onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextContent({ html }: { html: string }) {
  if (!html || html === "<p></p>") return null;
  return (
    <div
      className="prose prose-sm prose-invert max-w-none text-xs text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0 [&_p]:my-0.5 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
