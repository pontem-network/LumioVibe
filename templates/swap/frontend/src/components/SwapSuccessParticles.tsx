import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
}

export const SwapSuccessParticles = ({ 
  isActive, 
  onComplete 
}: { 
  isActive: boolean; 
  onComplete: () => void;
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = [
        "hsl(270, 70%, 50%)", // primary purple
        "hsl(300, 80%, 50%)", // magenta
        "hsl(0, 85%, 70%)",   // coral
        "hsl(142, 70%, 45%)", // success green
        "hsl(38, 92%, 50%)",  // gold
      ];

      const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50 + (Math.random() - 0.5) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        angle: Math.random() * 360,
        speed: Math.random() * 200 + 100,
      }));

      setParticles(newParticles);

      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                left: `calc(${particle.x}% + ${Math.cos(particle.angle * Math.PI / 180) * particle.speed}px)`,
                top: `calc(${particle.y}% + ${Math.sin(particle.angle * Math.PI / 180) * particle.speed}px)`,
                scale: 0,
                opacity: 0,
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
              }}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
