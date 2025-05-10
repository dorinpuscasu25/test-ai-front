"use client";

import { useState, useEffect } from "react";
import { InterviewSimulation } from "@/components/interview/interview-simulation";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InterviewPage() {
  const [isComplete, setIsComplete] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Prevent scrolling on the body when component mounts
    document.body.style.overflow = "hidden";

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isComplete) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Re-enable scrolling when component unmounts
      document.body.style.overflow = "auto";
    };
  }, [isComplete]);

  const handleEndInterview = () => {
    setShowDialog(true);
  };

  const confirmEndInterview = () => {
    setIsComplete(true);
    setShowDialog(false);
    router.push("/");
  };

  return (
      <div className="w-full h-full">
        <InterviewSimulation onEnd={handleEndInterview} />

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>End Interview Simulation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to end this interview simulation? Your progress will be saved.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmEndInterview}>
                End Interview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
