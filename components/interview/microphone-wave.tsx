"use client";

import { useEffect, useRef } from "react";
import { useSpring, animated } from "react-spring";
import { cn } from "@/lib/utils";

interface MicrophoneWaveProps {
  isActive: boolean;
  size?: "sm" | "md" | "lg";
}

export function MicrophoneWave({ isActive, size = "md" }: MicrophoneWaveProps) {
  const waveCount = 6;
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Create a spring animation for each wave
  const springs = Array(waveCount).fill(0).map((_, i) => 
    useSpring({
      from: { scale: 0.6, opacity: 0.8 },
      to: async (next) => {
        while (true) {
          if (isActive) {
            // Random height to simulate sound waves
            const randomScale = 0.6 + Math.random() * 0.7;
            await next({ scale: randomScale, opacity: 0.8 });
            await next({ scale: 0.6, opacity: 0.4 });
          } else {
            await next({ scale: 0.6, opacity: 0.2 });
          }
        }
      },
      config: { tension: 200, friction: 20 },
      delay: i * 100, // Stagger the animations
    })
  );

  // Size classes
  const sizeClasses = {
    sm: {
      container: "h-4 gap-[2px]",
      wave: "w-[2px]",
    },
    md: {
      container: "h-10 gap-[3px]",
      wave: "w-[3px]",
    },
    lg: {
      container: "h-16 gap-1",
      wave: "w-1",
    }
  };

  return (
    <div className={cn(
      "flex items-end justify-center", 
      sizeClasses[size]?.container || sizeClasses.md.container
    )}>
      {springs.map((spring, index) => (
        <animated.div
          key={index}
          ref={el => circleRefs.current[index] = el}
          className={cn(
            "bg-primary rounded-full h-full",
            sizeClasses[size]?.wave || sizeClasses.md.wave
          )}
          style={{
            transform: spring.scale.to(s => `scaleY(${s})`),
            opacity: spring.opacity,
          }}
        />
      ))}
    </div>
  );
}