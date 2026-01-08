import { FloatingSpheres } from "#/components/ui/floating-spheres";

export function PreLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
      {/* Lumio background glow effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(174, 121, 147, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(14, 105, 169, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse 50% 30% at 50% 50%, rgba(174, 121, 147, 0.05) 0%, transparent 40%)
              `,
        }}
      />
      <FloatingSpheres />
      <div className="z-10 flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    </div>
  );
}
