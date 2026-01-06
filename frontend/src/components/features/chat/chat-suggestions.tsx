import { motion, AnimatePresence } from "framer-motion";
// import { Suggestions } from "#/components/features/suggestions/suggestions";
// import { SUGGESTIONS } from "#/utils/suggestions";
import { useConversationStore } from "#/state/conversation-store";
import { Logo } from "#/components/features/logo/logo";

interface ChatSuggestionsProps {
  onSuggestionsClick: (value: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ChatSuggestions({ onSuggestionsClick }: ChatSuggestionsProps) {
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
          {/* <Suggestions
            suggestions={Object.entries(SUGGESTIONS.repo)
              .slice(0, 4)
              .map(([label, value]) => ({
                label,
                value,
              }))}
            onSuggestionClick={onSuggestionsClick}
          /> */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
