import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingTopBar } from "@/components/FloatingTopBar";
import { TimelinePlanner } from "@/components/TimelinePlanner";
import { TaskListPage } from "@/components/TaskListPage";
import { CalendarPage } from "@/components/CalendarPage";
import { StudyRoutineGenerator } from "@/components/StudyRoutineGenerator";
import { AIHubPage } from "@/components/AIHubPage";
import { FocusMode } from "@/components/FocusMode";
import { MetaDashboard } from "@/components/MetaDashboard";
import { PerformancePage } from "@/components/EsPCExPerformance";
import { ProfilePage } from "@/components/ProfilePage";
import { NotesPanel } from "@/components/NotesPanel";
import { FocusTimerProvider } from "@/hooks/useFocusTimer";
import { type DbTask } from "@/hooks/useTasks";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [notesTask, setNotesTask] = useState<DbTask | null>(null);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <MetaDashboard />;
      case "planner": return <TimelinePlanner />;
      case "tasks": return <TaskListPage />;
      case "calendar": return <CalendarPage />;
      case "study": return <StudyRoutineGenerator />;
      case "aihub": return <AIHubPage />;
      case "focus": return <FocusMode onOpenNotes={(task) => setNotesTask(task)} />;
      case "performance": return <PerformancePage />;
      case "espcex": return <PerformancePage />;
      case "profile": return <ProfilePage />;
      default: return <MetaDashboard />;
    }
  };

  return (
    <FocusTimerProvider>
      <div className="min-h-screen bg-background bg-grid">
        <FloatingTopBar currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col min-w-0"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Notes Panel (accessible from Focus Mode) */}
        <NotesPanel
          task={notesTask}
          onClose={() => setNotesTask(null)}
          onEdit={() => {}}
          onToggleComplete={() => {}}
        />
      </div>
    </FocusTimerProvider>
  );
};

export default Index;
