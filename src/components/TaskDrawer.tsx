import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerTrigger, DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { categories, iconMap, type CategoryId } from "@/lib/taskData";
import type { NewTask } from "@/hooks/useTasks";

interface TaskDrawerProps {
  onSubmit: (task: NewTask) => Promise<any>;
  defaultDate?: string; // YYYY-MM-DD
}

const iconOptions = Object.keys(iconMap);

export function TaskDrawer({ onSubmit, defaultDate }: TaskDrawerProps) {
  const [open, setOpen] = useState(false);
  const today = defaultDate || new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState<CategoryId>("work");
  const [recurrence, setRecurrence] = useState("none");
  const [icon, setIcon] = useState("briefcase");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setStartDate(today); setStartTime("09:00");
    setEndTime("10:00"); setIsAllDay(false); setCategory("work"); setRecurrence("none");
    setIcon("briefcase"); setLocation("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const st = isAllDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
    const et = isAllDay ? `${startDate}T23:59:59` : `${startDate}T${endTime}:00`;
    await onSubmit({
      title, description, start_time: st, end_time: et,
      is_all_day: isAllDay, category, recurrence, icon, location,
    });
    setLoading(false);
    reset();
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-pink shadow-lg hover:scale-105 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-card border-border/30 max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="font-display text-foreground">Nova Tarefa</DrawerTitle>
          <DrawerDescription className="text-muted-foreground">Preencha os dados da tarefa</DrawerDescription>
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
              <Select value={category} onValueChange={v => setCategory(v as CategoryId)}>
                <SelectTrigger className="bg-secondary border-border/50 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/30">
                  {(Object.keys(categories) as CategoryId[]).map(id => (
                    <SelectItem key={id} value={id}>{categories[id].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {loading ? "Salvando..." : "Criar Tarefa"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
