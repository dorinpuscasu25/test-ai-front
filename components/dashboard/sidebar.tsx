"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "@/components/dashboard/user-nav";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, LayoutDashboard, VideoIcon, Clock } from "lucide-react";
import { InterviewForm } from "@/components/interview/interview-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface SidebarNavItem {
  title: string;
  date: string;
  time: string;
  label?: string;
  icon?: React.ReactNode;
  href: string;
}

const interviewHistory: SidebarNavItem[] = [
  {
    title: "Senior Frontend Developer - Google",
    date: "May 12, 2025",
    time: "45 min",
    href: "/history/1",
  },
  {
    title: "Full Stack Engineer - Amazon",
    date: "May 10, 2025",
    time: "38 min",
    href: "/history/2",
  },
  {
    title: "Backend Developer - Meta",
    date: "May 5, 2025",
    time: "55 min",
    href: "/history/3",
  },
  {
    title: "QA Engineer - Apple",
    date: "April 28, 2025",
    time: "42 min",
    href: "/history/4",
  },
  {
    title: "DevOps Engineer - Microsoft",
    date: "April 20, 2025",
    time: "50 min",
    href: "/history/5",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showNewInterviewDialog, setShowNewInterviewDialog] = useState(false);

  return (
    <>
      <div className="group  z-30 flex h-screen w-16 flex-col justify-between border-r bg-background p-3 transition-all duration-300 hover:w-64 lg:w-64">
        <div className="flex flex-col gap-4">
          <div className="flex h-16 items-center justify-center rounded-md">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2"
            >
              <VideoIcon className="h-6 w-6 text-primary" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:opacity-100 font-semibold">
                VeezifyAI
              </span>
            </Link>
          </div>
          <div className="space-y-2 px-2">
            <div

              className="flex items-center gap-2 rounded-md"
              onClick={() => setShowNewInterviewDialog(true)}
            >
              <PlusCircle className="text-primary mr-2 h-4 w-4" />
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:opacity-100">
                New Interview
              </span>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <Link href="/">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:opacity-100">
                  Dashboard
                </span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2">
            <h4 className="text-sm font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:opacity-100">
              Interview History
            </h4>
          </div>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-1 p-2">
              {interviewHistory.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col space-y-1 rounded-md px-3 py-2 text-sm transition-all hover:bg-accent",
                    pathname === item.href
                      ? "bg-accent"
                      : "transparent"
                  )}
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:opacity-100 font-medium">
                    {item.title}
                  </span>
                  <div className="flex items-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 lg:opacity-100">
                    <Clock className="mr-1 h-3 w-3" />
                    {item.date} · {item.time}
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div>
          <Separator className="my-4" />
          <div className="px-2">
            <UserNav />
          </div>
        </div>
      </div>

      <Dialog open={showNewInterviewDialog} onOpenChange={setShowNewInterviewDialog}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <AnimatePresence>
            {showNewInterviewDialog && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <InterviewForm onSubmit={() => setShowNewInterviewDialog(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
