import { motion, useScroll, useTransform } from "framer-motion";
import { Header } from "./Header";
import { CoinTicker } from "./CoinTicker";

interface PageLayoutProps {
  children: React.ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image with Parallax */}
      <motion.div
        style={{ y: backgroundY }}
        className="fixed inset-0 z-0 pointer-events-none"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/images/background.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10">
        <Header />
        <CoinTicker />
        <main className="container py-6 px-4">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 mt-12">
          <div className="container px-4 text-center text-sm text-muted-foreground">
            <p>© 2024 VibeSwap. Decentralized trading across multiple chains.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
