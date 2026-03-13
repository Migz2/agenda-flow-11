import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { TimelinePlanner } from "@/components/TimelinePlanner";
import { HyperCharts } from "@/components/HyperCharts";
import { TaskListPage } from "@/components/TaskListPage";
import { CalendarPage } from "@/components/CalendarPage";
import { Menu } from "lucide-react";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("planner");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case "charts": return <HyperCharts />;
      case "tasks": return <TaskListPage />;
      case "calendar": return <CalendarPage />;
      default: return <TimelinePlanner />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <AppSidebar currentPage={currentPage} onNavigate={(p) => { setCurrentPage(p); setSidebarOpen(false); }} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center h-12 border-b border-border/50 px-4">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-display font-semibold text-sm text-foreground">NeonPlanner</span>
        </div>
        {renderPage()}
      </div>
    </div>
  );
};

export default Index;
