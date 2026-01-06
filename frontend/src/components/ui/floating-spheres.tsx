interface Sphere {
  id: number;
  size: number;
  x: string;
  y: string;
  delay: number;
  duration: number;
  opacity: number;
  variant: "purple" | "pink";
}

const spheres: Sphere[] = [
  {
    id: 1,
    size: 280,
    x: "-2%",
    y: "8%",
    delay: 0,
    duration: 20,
    opacity: 0.45,
    variant: "purple",
  },
  {
    id: 2,
    size: 160,
    x: "12%",
    y: "28%",
    delay: 2,
    duration: 18,
    opacity: 0.4,
    variant: "pink",
  },
  {
    id: 3,
    size: 240,
    x: "80%",
    y: "5%",
    delay: 1,
    duration: 22,
    opacity: 0.42,
    variant: "purple",
  },
  {
    id: 4,
    size: 180,
    x: "88%",
    y: "45%",
    delay: 3,
    duration: 16,
    opacity: 0.38,
    variant: "pink",
  },
  {
    id: 5,
    size: 200,
    x: "5%",
    y: "62%",
    delay: 2.5,
    duration: 19,
    opacity: 0.4,
    variant: "purple",
  },
  {
    id: 6,
    size: 150,
    x: "75%",
    y: "68%",
    delay: 1.5,
    duration: 17,
    opacity: 0.35,
    variant: "pink",
  },
];

// 3D sphere gradient - light from top-left, dark at bottom-right
const getBaseGradient = (variant: "purple" | "pink") => {
  if (variant === "purple") {
    // Light source from top-left corner
    return `radial-gradient(circle at 30% 30%,
      rgba(130, 100, 170, 0.95) 0%,
      rgba(90, 60, 130, 0.9) 40%,
      rgba(50, 30, 80, 0.95) 80%,
      rgba(30, 15, 50, 1) 100%
    )`;
  }
  return `radial-gradient(circle at 30% 30%,
    rgba(170, 110, 140, 0.95) 0%,
    rgba(130, 70, 100, 0.9) 40%,
    rgba(80, 40, 60, 0.95) 80%,
    rgba(50, 20, 35, 1) 100%
  )`;
};

const getGlow = (variant: "purple" | "pink", size: number) => {
  if (variant === "purple") {
    return `
      0 0 ${size * 0.12}px rgba(150, 120, 200, 0.6),
      0 0 ${size * 0.3}px rgba(120, 90, 170, 0.4),
      0 0 ${size * 0.5}px rgba(100, 70, 150, 0.2)
    `;
  }
  return `
    0 0 ${size * 0.12}px rgba(200, 140, 170, 0.6),
    0 0 ${size * 0.3}px rgba(170, 110, 140, 0.4),
    0 0 ${size * 0.5}px rgba(150, 90, 120, 0.2)
  `;
};

const getBorder = (variant: "purple" | "pink") => {
  if (variant === "purple") {
    return "1px solid rgba(180, 150, 220, 0.4)";
  }
  return "1px solid rgba(220, 160, 190, 0.4)";
};

export function FloatingSpheres() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {spheres.map((sphere) => (
        <div
          key={sphere.id}
          className="absolute rounded-full floating-sphere"
          style={{
            width: `${sphere.size}px`,
            height: `${sphere.size}px`,
            left: sphere.x,
            top: sphere.y,
            opacity: sphere.opacity,
            animationDelay: `${sphere.delay}s`,
            animationDuration: `${sphere.duration}s`,
            background: getBaseGradient(sphere.variant),
            border: getBorder(sphere.variant),
            boxShadow: getGlow(sphere.variant, sphere.size),
            position: "absolute",
          }}
        >
          {/* Specular highlight on top-left */}
          <div
            style={{
              position: "absolute",
              top: "8%",
              left: "12%",
              width: "25%",
              height: "25%",
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%,
                rgba(255, 255, 255, 0.9) 0%,
                rgba(255, 255, 255, 0.5) 30%,
                transparent 70%
              )`,
              filter: "blur(4px)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
