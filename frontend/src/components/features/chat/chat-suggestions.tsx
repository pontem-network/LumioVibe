import { motion, AnimatePresence } from "framer-motion";
import { useConversationStore } from "#/state/conversation-store";
import { Logo } from "#/components/features/logo/logo";

export function ChatSuggestions() {
  const { shouldHideSuggestions } = useConversationStore();

  return (
    <AnimatePresence>
      {!shouldHideSuggestions && (
        <motion.div
          data-testid="chat-suggestions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute top-0 left-0 right-0 bottom-[151px] flex flex-col items-center justify-center pointer-events-auto"
        >
          <Logo />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
