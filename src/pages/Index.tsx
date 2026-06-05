import { useState } from "react";
import { FloatingTopBar } from "@/components/FloatingTopBar";
import { TimelinePlanner } from "@/components/TimelinePlanner";
import { TaskListPage } from "@/components/TaskListPage";
import { CalendarPage } from "@/components/CalendarPage";
import { StudyRoutineGenerator } from "@/components/StudyRoutineGenerator";
import { AIHubPage } from "@/components/AIHubPage";
import { FocusMode } from "@/components/FocusMode";
import { MetaDashboard } from "@/components/MetaDashboard";
import { EsPCExPerformance } from "@/components/EsPCExPerformance";
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
      case "espcex": return <EsPCExPerformance />;
      case "profile": return <ProfilePage />;
      default: return <MetaDashboard />;
    }
  };

  return (
    <FocusTimerProvider>
      <div className="min-h-screen bg-background bg-grid">
        <FloatingTopBar currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="flex-1 flex flex-col min-w-0">
          {renderPage()}
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
