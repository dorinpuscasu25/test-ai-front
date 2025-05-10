"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface VoiceGradientProps {
    isActive: boolean;
    colors?: string[];
    size?: "sm" | "md" | "lg";
    className?: string;
}

export const VoiceGradient = ({
                                  isActive,
                                  colors = ["#8B5CF6", "#6EE7B7", "#3B82F6"],  // Purple, Green, Blue gradient
                                  size = "md",
                                  className = "",
                              }: VoiceGradientProps) => {
    const [amplitudes, setAmplitudes] = useState<number[]>(Array(8).fill(20));
    const animationRef = useRef<number | null>(null);

    // Size mapping
    const sizeMap = {
        sm: {
            height: "100px",
            width: "100px",
            strokeWidth: 3,
        },
        md: {
            height: "150px",
            width: "150px",
            strokeWidth: 4,
        },
        lg: {
            height: "200px",
            width: "200px",
            strokeWidth: 5,
        },
    };

    useEffect(() => {
        if (!isActive) {
            setAmplitudes(Array(8).fill(20));
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }

        const animate = () => {
            setAmplitudes(prev =>
                prev.map(() =>
                    // Random values between 15-80 when active
                    isActive ? Math.random() * 65 + 15 : 20
                )
            );
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive]);

    // Create gradient definition
    const gradientId = "voiceGradient";
    const selectedSize = sizeMap[size];

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={{
                height: selectedSize.height,
                width: selectedSize.width
            }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                className="absolute"
            >
                <defs>
                    <linearGradient id={gradientId} gradientTransform="rotate(90)">
                        <stop offset="0%" stopColor={colors[0]} />
                        <stop offset="50%" stopColor={colors[1]} />
                        <stop offset="100%" stopColor={colors[2]} />
                    </linearGradient>
                </defs>

                <motion.path
                    d={generateBlobPath(amplitudes)}
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={selectedSize.strokeWidth}
                    strokeLinecap="round"
                    initial={{ opacity: 0.6 }}
                    animate={{
                        opacity: isActive ? 1 : 0.6,
                    }}
                    transition={{ duration: 0.3 }}
                />
            </svg>
        </div>
    );
};

// Helper function to generate blob path
function generateBlobPath(amplitudes: number[]): string {
    const numPoints = amplitudes.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const center = 50;
    const points = [];

    // Generate points around a circle
    for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep;
        const radius = amplitudes[i];
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        points.push({ x, y });
    }

    // Create SVG path
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < numPoints; i++) {
        const currentPoint = points[i];
        const nextPoint = points[(i + 1) % numPoints];

        // Control points for bezier curve
        const cp1x = currentPoint.x + (nextPoint.x - points[(i - 1 + numPoints) % numPoints].x) / 6;
        const cp1y = currentPoint.y + (nextPoint.y - points[(i - 1 + numPoints) % numPoints].y) / 6;

        const cp2x = nextPoint.x - (points[(i + 2) % numPoints].x - currentPoint.x) / 6;
        const cp2y = nextPoint.y - (points[(i + 2) % numPoints].y - currentPoint.y) / 6;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${nextPoint.x} ${nextPoint.y}`;
    }

    path += " Z";
    return path;
}
