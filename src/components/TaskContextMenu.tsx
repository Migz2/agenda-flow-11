import { useState, useRef, useEffect } from "react";
import { BookOpen, Pencil } from "lucide-react";
import type { DbTask } from "@/hooks/useTasks";

interface TaskContextMenuProps {
  task: DbTask | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onOpenNotes: (task: DbTask) => void;
  onEdit: (task: DbTask) => void;
}

export function TaskContextMenu({ task, position, onClose, onOpenNotes, onEdit }: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!task) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [task, onClose]);

  if (!task || !position) return null;

  // Adjust position to stay within viewport
  const menuWidth = 200;
  const menuHeight = 100;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 16);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 16);

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div
        ref={menuRef}
        className="absolute z-[101] bg-popover border border-border/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ left: x, top: y, minWidth: menuWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary/80 transition-colors"
          onClick={() => { onOpenNotes(task); onClose(); }}
        >
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Abrir Bloco de Notas</span>
        </button>
        <div className="h-px bg-border/30 mx-2" />
        <button
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary/80 transition-colors"
          onClick={() => { onEdit(task); onClose(); }}
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
          <span>Editar Atividade</span>
        </button>
      </div>
    </div>
  );
}
