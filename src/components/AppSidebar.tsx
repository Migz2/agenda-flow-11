import { CalendarDays, LayoutList, CheckSquare, Calendar, BarChart3, LogOut, UserCircle, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "planner", label: "Planner", icon: LayoutList },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "study", label: "Estudos", icon: GraduationCap },
  { id: "profile", label: "Perfil", icon: UserCircle },
];

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { signOut } = useAuth();

  return (
    <aside className="w-16 lg:w-52 min-h-screen bg-sidebar flex flex-col border-r border-border/50 shrink-0 transition-all duration-300">
      <div className="p-4 lg:px-5 lg:py-6">
        <h1 className="hidden lg:block text-lg font-display font-bold text-foreground tracking-tight">
          NeonPlanner
        </h1>
        <div className="lg:hidden flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 lg:px-3 mt-4">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                }
              `}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              {isActive && (
                <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-2 lg:px-3 pb-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
