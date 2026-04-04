import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, LayoutList, CheckSquare, Calendar, Brain, BookOpen, Sun, Moon, LogOut, Timer, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingTopBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "planner", label: "Planner", icon: LayoutList },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "study", label: "Estudos", icon: GraduationCap },
  { id: "aihub", label: "AI Hub", icon: Brain },
  { id: "focus", label: "Foco", icon: Timer },
  { id: "library", label: "Library", icon: BookOpen },
];

export function FloatingTopBar({ currentPage, onNavigate }: FloatingTopBarProps) {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl backdrop-blur-xl bg-background/70 border border-border/40 shadow-lg dark:shadow-[0_0_30px_hsl(330_100%_50%/0.1)]">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={`relative p-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "neu-pressed text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {isActive && (
                        <motion.div
                          layoutId="topbar-indicator"
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            <div className="w-px h-5 bg-border/50 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleTheme} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={signOut} className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Sair</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
