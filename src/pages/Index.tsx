import { useState } from "react";
import { FloatingTopBar } from "@/components/FloatingTopBar";
import { TimelinePlanner } from "@/components/TimelinePlanner";
import { TaskListPage } from "@/components/TaskListPage";
import { CalendarPage } from "@/components/CalendarPage";
import { StudyRoutineGenerator } from "@/components/StudyRoutineGenerator";
import { AIHubPage } from "@/components/AIHubPage";
import { FocusMode } from "@/components/FocusMode";
import { MetaDashboard } from "@/components/MetaDashboard";
import { LibraryPage } from "@/components/LibraryPage";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <MetaDashboard />;
      case "planner": return <TimelinePlanner />;
      case "tasks": return <TaskListPage />;
      case "calendar": return <CalendarPage />;
      case "study": return <StudyRoutineGenerator />;
      case "aihub": return <AIHubPage />;
      case "focus": return <FocusMode />;
      case "library": return <LibraryPage />;
      default: return <MetaDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <FloatingTopBar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col min-w-0">
        {renderPage()}
      </div>
    </div>
  );
};

export default Index;
