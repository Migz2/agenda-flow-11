import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, LayoutList, Calendar, Brain, Sun, Moon, LogOut, Timer, User, Target, Settings, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FloatingTopBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "performance", label: "Desempenho", icon: Target },
  { id: "planner", label: "Daily Planner", icon: LayoutList },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "focus", label: "Foco", icon: Timer },
  { id: "study", label: "Gerador de Rotina", icon: Sparkles },
  { id: "aihub", label: "AI Study Hub", icon: Brain },
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
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                      <Settings className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Configurações</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="bg-card neu-flat border-border/40 rounded-xl min-w-44">
                <DropdownMenuItem onClick={() => onNavigate("profile")} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
