"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff, Settings, Pause,
  Play, Timer, Volume2, Type, CheckCircle
} from "lucide-react";

// Large Gradient Wave Effect for user speaking
const LargeGradientWaveEffect = ({ isActive } : any) => {
  return (
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
        <AnimatePresence>
          {isActive && (
              <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.5 }}
                  className="relative"
              >
                {/* Multiple gradient circles that pulse */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                        initial={{
                          width: 200 + (i * 100),
                          height: 200 + (i * 100),
                          opacity: 0.7 - (i * 0.2)
                        }}
                        animate={{
                          width: [
                            200 + (i * 100),
                            300 + (i * 150),
                            250 + (i * 120),
                            320 + (i * 180)
                          ],
                          height: [
                            200 + (i * 100),
                            300 + (i * 150),
                            250 + (i * 120),
                            320 + (i * 180)
                          ],
                          opacity: [
                            0.7 - (i * 0.2),
                            0.8 - (i * 0.2),
                            0.6 - (i * 0.2),
                            0.9 - (i * 0.2)
                          ]
                        }}
                        transition={{
                          duration: 3 + (i * 0.5),
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                        style={{
                          background: `radial-gradient(circle, rgba(236,72,153,0.7) 0%, rgba(59,130,246,0.6) 45%, rgba(110,231,183,0.5) 100%)`,
                          zIndex: -10 + i
                        }}
                    />
                ))}
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};

interface InterviewSimulationProps {
  onEnd: () => void;
}

export function InterviewSimulation({ onEnd }: InterviewSimulationProps) {
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  const questions = [
    "Tell me about yourself and your experience.",
    "What projects have you worked on that you're particularly proud of?",
    "How do you handle challenging situations in a team environment?",
    "Can you explain a complex technical problem you've solved recently?",
    "Where do you see yourself in 5 years?",
  ];

  // Simulated feedback items
  const feedbackItems = [
    "Good eye contact and posture",
    "Speaking at a good pace",
    "Try to use more concrete examples",
    "Good use of technical terminology",
    "Consider structuring your answer with STAR method",
  ];

  // Timer effect
  useEffect(() => {
    // Request camera access if needed
    if (videoRef.current && !isVideoOff) {
      navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.error("Error accessing camera:", err);
            setIsVideoOff(true);
          });
    }

    // Timer with requestAnimationFrame
    let lastTime = performance.now();
    let accumulatedTime = 0;

    const updateTimer = (currentTime: number) => {
      if (isPaused) {
        lastTime = currentTime;
        timerRef.current = requestAnimationFrame(updateTimer);
        return;
      }

      const deltaTime = currentTime - lastTime;
      accumulatedTime += deltaTime;

      if (accumulatedTime >= 1000) {
        setElapsedTime(prev => prev + 1);
        accumulatedTime -= 1000;
      }

      lastTime = currentTime;
      timerRef.current = requestAnimationFrame(updateTimer);
    };

    timerRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isPaused, isVideoOff]);

  // Simulate user speaking
  useEffect(() => {
    if (isPaused || isMicMuted) return;

    // Simulate user speaking
    const userSpeakingInterval = setInterval(() => {
      setIsUserSpeaking(true);

      setTimeout(() => {
        setIsUserSpeaking(false);
      }, 4000); // Speak for 4 seconds

    }, 8000); // Every 8 seconds

    return () => {
      clearInterval(userSpeakingInterval);
    };
  }, [isPaused, isMicMuted]);

  // Feedback generation
  useEffect(() => {
    if (isPaused) return;

    const feedbackInterval = setInterval(() => {
      if (isUserSpeaking) {
        const randomFeedback = feedbackItems[Math.floor(Math.random() * feedbackItems.length)];
        setFeedback(prev => [...prev.slice(-3), randomFeedback]);
      }
    }, 4000);

    return () => clearInterval(feedbackInterval);
  }, [isPaused, isUserSpeaking]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      onEnd();
    }
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
      <div className="w-full h-full flex flex-col items-center py-4">
        {/* Main background */}
        <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-0"></div>

        {/* Large Gradient Wave effect when user is speaking */}


        <div className="relative z-10 flex items-center justify-between w-full mb-8">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="px-3 py-1 text-lg font-semibold">
              <Timer className="mr-2 h-4 w-4" />
              {formatTime(elapsedTime)} / 30:00
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              Question {currentQuestion + 1} of {questions.length}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/*<Button variant="outline" size="sm" onClick={togglePause}>*/}
            {/*  {isPaused ? (*/}
            {/*      <><Play className="h-4 w-4 mr-1" /> Resume</>*/}
            {/*  ) : (*/}
            {/*      <><Pause className="h-4 w-4 mr-1" /> Pause</>*/}
            {/*  )}*/}
            {/*</Button>*/}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 w-full flex-1">
          <div className="md:col-span-2 flex flex-col">
            <Card className="flex-1 border-2 border-gray-800 bg-black/30 backdrop-blur-sm overflow-hidden relative">
              <CardContent className="p-6 flex flex-col h-full items-center justify-between relative z-10">
                <div className="mb-8 w-full">
                  <h2 className="text-xl font-bold mb-2">
                    Question:
                  </h2>

                  <LargeGradientWaveEffect isActive={!isMicMuted && !isPaused && isUserSpeaking} />

                  <div className="relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                          key={currentQuestion}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="text-xl leading-relaxed"
                      >
                        {questions[currentQuestion]}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-auto w-full flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2 text-muted-foreground">Your microphone:</h3>
                    <div className="w-full h-10 flex items-center justify-center">
                      {isUserSpeaking && !isMicMuted ? (
                          <span className="text-green-400 font-medium animate-pulse">
                        Speaking...
                      </span>
                      ) : isMicMuted ? (
                          <span className="text-red-400 font-medium">
                        Microphone muted
                      </span>
                      ) : (
                          <span className="text-gray-400 font-medium">
                        Ready to speak
                      </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-card p-3 rounded-lg">
                    <div className="flex space-x-3">
                      <Button
                          variant={isMicMuted ? "destructive" : "outline"}
                          size="icon"
                          onClick={() => setIsMicMuted(!isMicMuted)}
                      >
                        {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                      <Button
                          variant={isVideoOff ? "destructive" : "outline"}
                          size="icon"
                          onClick={() => setIsVideoOff(!isVideoOff)}
                      >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                      </Button>
                    </div>

                    <Button onClick={nextQuestion}>
                      {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Interview"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="border-2 border-gray-800 bg-black/30 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Camera Preview</h3>
                {isVideoOff ? (
                    <div className="aspect-video bg-muted flex items-center justify-center rounded-md">
                      <VideoOff className="h-10 w-10 text-muted-foreground" />
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="aspect-video w-full rounded-md bg-black"
                    />
                )}
              </CardContent>
            </Card>

            <Card className="flex-1 border-2 border-gray-800 bg-black/30 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">AI Feedback</h3>
                <div className="space-y-2">
                  {feedback.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Feedback will appear here as you speak...
                      </p>
                  ) : (
                      feedback.map((item, index) => (
                          <motion.div
                              key={`feedback-${index}-${item}`}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center py-2 px-3 bg-card rounded-md"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-sm">{item}</span>
                          </motion.div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
