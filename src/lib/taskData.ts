import { 
  AlarmClock, 
  Dumbbell, 
  BookOpen, 
  Bike, 
  Users, 
  Coffee, 
  Code, 
  Music, 
  Briefcase,
  Gamepad2,
  Heart,
  Palette
} from "lucide-react";

export type CategoryId = "health" | "work" | "study" | "sports" | "leisure" | "social";

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  glowClass: string;
  hsl: string;
}

export interface Task {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  category: CategoryId;
  icon: string;
  location?: string;
  completed: boolean;
}

export const categories: Record<CategoryId, Category> = {
  health: { id: "health", label: "Saúde", color: "bg-neon-pink", glowClass: "glow-pink", hsl: "330 100% 50%" },
  work: { id: "work", label: "Trabalho", color: "bg-neon-orange", glowClass: "glow-orange", hsl: "22 100% 50%" },
  study: { id: "study", label: "Estudos", color: "bg-neon-blue", glowClass: "glow-blue", hsl: "186 100% 50%" },
  sports: { id: "sports", label: "Esportes", color: "bg-neon-green", glowClass: "glow-green", hsl: "110 100% 55%" },
  leisure: { id: "leisure", label: "Lazer", color: "bg-neon-purple", glowClass: "glow-purple", hsl: "280 100% 60%" },
  social: { id: "social", label: "Social", color: "bg-neon-yellow", glowClass: "glow-yellow", hsl: "50 100% 55%" },
};

export const iconMap: Record<string, React.ComponentType<any>> = {
  alarm: AlarmClock,
  dumbbell: Dumbbell,
  book: BookOpen,
  bike: Bike,
  users: Users,
  coffee: Coffee,
  code: Code,
  music: Music,
  briefcase: Briefcase,
  gamepad: Gamepad2,
  heart: Heart,
  palette: Palette,
};

export const sampleTasks: Task[] = [
  { id: "1", title: "Rise and Shine", startTime: "07:00", endTime: "07:30", category: "health", icon: "alarm", completed: true },
  { id: "2", title: "Morning Yoga", startTime: "07:30", endTime: "08:00", category: "sports", icon: "dumbbell", location: "Academia", completed: true },
  { id: "3", title: "Bike to Office", startTime: "08:15", endTime: "08:30", category: "sports", icon: "bike", completed: true },
  { id: "4", title: "Filosofia", startTime: "09:00", endTime: "09:55", category: "study", icon: "book", location: "Sala C 205", completed: false },
  { id: "5", title: "Código do Projeto", startTime: "10:00", endTime: "11:30", category: "work", icon: "code", location: "Home Office", completed: false },
  { id: "6", title: "Team Meeting", startTime: "11:30", endTime: "12:30", category: "social", icon: "users", location: "Sala de Reuniões", completed: false },
  { id: "7", title: "Almoço & Descanso", startTime: "12:30", endTime: "13:30", category: "leisure", icon: "coffee", completed: false },
  { id: "8", title: "Leitura", startTime: "14:00", endTime: "15:00", category: "study", icon: "book", location: "Biblioteca", completed: false },
  { id: "9", title: "Música", startTime: "17:00", endTime: "18:00", category: "leisure", icon: "music", location: "Studio", completed: false },
];

export function getTimeMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatDuration(start: string, end: string): string {
  const diff = getTimeMinutes(end) - getTimeMinutes(start);
  if (diff >= 60) {
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${diff} min`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export type TaskStatus = "completed" | "active" | "future";

export function getTaskStatus(task: Task, currentTime: number): TaskStatus {
  if (task.completed) return "completed";
  const start = getTimeMinutes(task.startTime);
  const end = getTimeMinutes(task.endTime);
  if (currentTime >= start && currentTime < end) return "active";
  if (currentTime >= end) return "completed";
  return "future";
}
