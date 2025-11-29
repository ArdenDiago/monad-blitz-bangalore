"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const BackgroundAnimation = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    // Generate random particles
    const particles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 300 + 50, // 50px to 350px
        duration: Math.random() * 20 + 10, // 10s to 30s
        delay: Math.random() * 5,
        color: i % 3 === 0 ? "bg-primary/40" : i % 3 === 1 ? "bg-secondary/40" : "bg-accent/30",
    }));

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className={`absolute rounded-full blur-3xl ${particle.color}`}
                    initial={{
                        x: `${particle.x}vw`,
                        y: `${particle.y}vh`,
                        scale: 0.5,
                        opacity: 0,
                    }}
                    animate={{
                        x: [
                            `${particle.x}vw`,
                            `${(particle.x + Math.random() * 20 - 10 + 100) % 100}vw`,
                            `${(particle.x - Math.random() * 20 + 10 + 100) % 100}vw`,
                            `${particle.x}vw`,
                        ],
                        y: [
                            `${particle.y}vh`,
                            `${(particle.y + Math.random() * 20 - 10 + 100) % 100}vh`,
                            `${(particle.y - Math.random() * 20 + 10 + 100) % 100}vh`,
                            `${particle.y}vh`,
                        ],
                        scale: [0.5, 1.2, 0.8, 0.5],
                        opacity: [0, 0.8, 0.5, 0],
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: particle.delay,
                    }}
                    style={{
                        width: particle.size,
                        height: particle.size,
                    }}
                />
            ))}

            {/* Grid overlay for "tech" feel */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />
        </div>
    );
};
