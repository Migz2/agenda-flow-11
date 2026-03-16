import { 
  AlarmClock, Dumbbell, BookOpen, Bike, Users, Coffee, Code, Music, Briefcase,
  Gamepad2, Heart, Palette, GraduationCap, Brain, Calculator, Beaker, FileText
} from "lucide-react";

// No more hardcoded categories — everything is user-created via custom_categories table.

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
  graduation: GraduationCap,
  brain: Brain,
  calculator: Calculator,
  beaker: Beaker,
  file: FileText,
};

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
