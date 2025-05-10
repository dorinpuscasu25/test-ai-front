"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterviewForm } from "@/components/interview/interview-form";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function DashboardPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleFormSubmit = () => {
    setShowModal(false);
    router.push("/interview");
  };

  return (
    <div className="w-full h-full flex items-center justify-center py-8">
      <motion.div
        className="text-center space-y-6 py-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-bold tracking-tight">
          Hello <span className="text-primary">John</span>, are you ready to start a new simulation?
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Practice makes perfect. Our AI-powered interview simulator will help you prepare for
          your next job interview with real-time feedback and personalized coaching.
        </p>
        <Button size="lg" onClick={() => setShowModal(true)} className="mt-8">
          Start a New Interview Simulation
        </Button>
      </motion.div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-[600px] p-0 gap-0 bg-black/95 border border-gray-800 backdrop-blur-xl">
          <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
            <InterviewForm onSubmit={handleFormSubmit} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
