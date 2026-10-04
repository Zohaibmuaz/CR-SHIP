"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation, TabId } from "@/components/Navigation";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { StudentsTab } from "@/components/tabs/StudentsTab";
import { TimetableTab } from "@/components/tabs/TimetableTab";
import { AttendanceTab } from "@/components/tabs/AttendanceTab";
import { GroupsTab } from "@/components/tabs/GroupsTab";
import MaterialsTab from "@/components/tabs/MaterialsTab";
import TeachersTab from "@/components/tabs/TeachersTab";
import TasksTab from "@/components/tabs/TasksTab";
import { PlaceholderTab } from "@/components/tabs/PlaceholderTab";
import { LogsTab } from "@/components/tabs/LogsTab";
import {
  Users,
  CalendarDays,
  Camera,
  Layers,
  FolderGit2,
  GraduationCap,
  BellRing,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "overview" && <OverviewTab onNavigate={setActiveTab} />}

        {activeTab === "students" && <StudentsTab />}

        {activeTab === "timetable" && <TimetableTab />}

        {activeTab === "attendance" && <AttendanceTab />}

        {activeTab === "groups" && <GroupsTab />}

        {activeTab === "materials" && <MaterialsTab />}

        {activeTab === "teachers" && <TeachersTab />}

        {activeTab === "tasks" && <TasksTab />}

        {activeTab === "logs" && <LogsTab />}
      </div>
    </main>
  );
}
