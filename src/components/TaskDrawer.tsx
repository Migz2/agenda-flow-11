import { useState, useEffect } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { categories, iconMap, type CategoryId } from "@/lib/taskData";
import type { NewTask, DbTask, CustomCategory } from "@/hooks/useTasks";
import { useCustomCategories } from "@/hooks/useTasks";

interface TaskDrawerProps {
  onSubmit: (task: NewTask) => Promise<any>;
  onUpdate?: (taskId: string, task: Partial<NewTask>) => Promise<any>;
  defaultDate?: string;
  editTask?: DbTask | null;
  onClose?: () => void;
}

const iconOptions = Object.keys(iconMap);

const PALETTE_COLORS = [
  "#ff0080", "#ff6600", "#00d4ff", "#22cc44", "#aa44ff",
  "#ffcc00", "#ff4444", "#00ff88", "#4488ff", "#ff88cc",
];

const builtInCategoryIds = Object.keys(categories) as CategoryId[];

export function TaskDrawer({ onSubmit, onUpdate, defaultDate, editTask, onClose }: TaskDrawerProps) {
  const [open, setOpen] = useState(false);
  const { categories: customCats, addCategory } = useCustomCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState<string>("work");
  const [customCategoryId, setCustomCategoryId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState("none");
  const [icon, setIcon] = useState("briefcase");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // New custom category state
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#ff0080");
  const [showNewCat, setShowNewCat] = useState(false);

  // Open drawer when editTask is set
  useEffect(() => {
    if (editTask) {
      setOpen(true);
      setTitle(editTask.title);
      setDescription(editTask.description || "");
      const stDate = new Date(editTask.start_time);
      const etDate = new Date(editTask.end_time);
      setStartDate(stDate.toISOString().slice(0, 10));
      setStartTime(`${String(stDate.getHours()).padStart(2, "0")}:${String(stDate.getMinutes()).padStart(2, "0")}`);
      setEndTime(`${String(etDate.getHours()).padStart(2, "0")}:${String(etDate.getMinutes()).padStart(2, "0")}`);
      setIsAllDay(editTask.is_all_day);
      setCategory(editTask.category);
      setCustomCategoryId(editTask.custom_category_id);
      setRecurrence(editTask.recurrence);
      setIcon(editTask.icon);
      setLocation(editTask.location || "");
    }
  }, [editTask]);

  const reset = () => {
    setTitle(""); setDescription(""); 
    setStartDate(defaultDate || new Date().toISOString().slice(0, 10));
    setStartTime("09:00"); setEndTime("10:00"); setIsAllDay(false);
    setCategory("work"); setCustomCategoryId(null); setRecurrence("none");
    setIcon("briefcase"); setLocation(""); setNewCatName(""); setShowNewCat(false);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      reset();
      onClose?.();
    } else if (!editTask) {
      setStartDate(defaultDate || new Date().toISOString().slice(0, 10));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);

    // Build proper Date objects from local date + time to get correct ISO
    const stDate = isAllDay
      ? new Date(`${startDate}T00:00:00`)
      : new Date(`${startDate}T${startTime}:00`);
    const etDate = isAllDay
      ? new Date(`${startDate}T23:59:59`)
      : new Date(`${startDate}T${endTime}:00`);

    const taskData: NewTask = {
      title, description,
      start_time: stDate.toISOString(),
      end_time: etDate.toISOString(),
      is_all_day: isAllDay, category, recurrence, icon, location,
      custom_category_id: customCategoryId,
    };

    if (editTask && onUpdate) {
      await onUpdate(editTask.id, taskData);
    } else {
      await onSubmit(taskData);
    }
    setLoading(false);
    reset();
    setOpen(false);
    onClose?.();
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const cat = await addCategory(newCatName.trim(), newCatColor);
    if (cat) {
      setCategory("work"); // keep enum valid
      setCustomCategoryId(cat.id);
      setShowNewCat(false);
      setNewCatName("");
    }
  };

  const handleCategorySelect = (val: string) => {
    // Check if it's a custom category id
    const isCustom = customCats.find(c => c.id === val);
    if (isCustom) {
      setCategory("work"); // enum fallback
      setCustomCategoryId(val);
    } else {
      setCategory(val);
      setCustomCategoryId(null);
    }
  };

  const currentCatLabel = customCategoryId
    ? customCats.find(c => c.id === customCategoryId)?.name || "Custom"
    : categories[category as CategoryId]?.label || category;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      {!editTask && (
        <button
          onClick={() => handleOpenChange(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-pink shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
      <DrawerContent className="bg-card border-border/30 max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="font-display text-foreground">
            {editTask ? "Editar Tarefa" : "Nova Tarefa"}
          </DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            {editTask ? "Altere os dados da tarefa" : "Preencha os dados da tarefa"}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome da tarefa *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Reunião de equipe" className="bg-secondary border-border/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Detalhes</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional" className="bg-secondary border-border/50 mt-1 min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary border-border/50 mt-1" />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
              <Label className="text-xs text-muted-foreground">Dia todo</Label>
            </div>
          </div>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-secondary border-border/50 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-secondary border-border/50 mt-1" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={customCategoryId || category} onValueChange={handleCategorySelect}>
                <SelectTrigger className="bg-secondary border-border/50 mt-1">
                  <SelectValue>{currentCatLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/30">
                  {builtInCategoryIds.map(id => (
                    <SelectItem key={id} value={id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${categories[id].hsl})` }} />
                        {categories[id].label}
                      </span>
                    </SelectItem>
                  ))}
                  {customCats.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.color }} />
                        {cc.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => setShowNewCat(!showNewCat)}
                className="text-[10px] text-primary hover:underline mt-1"
              >
                + Nova categoria
              </button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Recorrência</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="bg-secondary border-border/50 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/30">
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showNewCat && (
            <div className="bg-secondary/50 rounded-xl p-3 border border-border/30 flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Nova Categoria</Label>
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nome da categoria" className="bg-secondary border-border/50" />
              <div>
                <Label className="text-xs text-muted-foreground">Cor</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {PALETTE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${newCatColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={handleCreateCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground mt-1">
                Criar Categoria
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Ícone</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="bg-secondary border-border/50 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/30">
                  {iconOptions.map(ic => (
                    <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Local</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Opcional" className="bg-secondary border-border/50 mt-1" />
            </div>
          </div>
        </div>
        <DrawerFooter className="flex-row gap-3">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1 border-border/50">Cancelar</Button>
          </DrawerClose>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground glow-pink">
            {loading ? "Salvando..." : editTask ? "Salvar Alterações" : "Criar Tarefa"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
