import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { I18nKey } from "#/i18n/declaration";
import { usePaginatedConversations } from "#/hooks/query/use-paginated-conversations";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { AppCard } from "./app-card";
import PlusIcon from "#/icons/u-plus.svg?react";

function RecentConversationsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]/95 overflow-hidden"
        >
          <div className="h-20 bg-white/5 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentConversations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const { mutate: createConversation, isPending } = useCreateConversation();

  const {
    data: conversationsList,
    isFetching,
    error,
  } = usePaginatedConversations(10);

  const conversations =
    conversationsList?.pages.flatMap((page) => page.results) ?? [];

  const displayLimit = isExpanded ? 12 : 4;
  const displayedConversations = conversations.slice(0, displayLimit);

  const hasConversations = conversations && conversations.length > 0;
  const hasMoreConversations =
    conversations && conversations.length > displayLimit;
  const isInitialLoading = isFetching && !conversationsList;

  const handleToggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNewApp = () => {
    createConversation(
      {},
      {
        onSuccess: (data) => {
          navigate(`/conversations/${data.conversation_id}`);
        },
      },
    );
  };

  if (!hasConversations && !isInitialLoading) {
    return null;
  }

  return (
    <section
      data-testid="recent-conversations"
      className="flex flex-col gap-3 w-full"
    >
      <div className="flex items-center justify-between">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <h2 className="text-xs leading-4 text-white font-bold">My Apps</h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleNewApp}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <PlusIcon width={12} height={12} />
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span>{isPending ? "Creating..." : "New App"}</span>
          </button>
          {hasConversations && (
            <Link
              to="/apps"
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span>View All</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-center py-8">
          <p className="text-danger text-sm">{error.message}</p>
        </div>
      )}

      {isInitialLoading && <RecentConversationsSkeleton />}

      {!isInitialLoading && hasConversations && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayedConversations.map((conversation) => (
            <AppCard
              key={conversation.conversation_id}
              conversation={conversation}
            />
          ))}
        </div>
      )}

      {!isInitialLoading && (hasMoreConversations || isExpanded) && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleToggleExpansion}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            {isExpanded
              ? t(I18nKey.COMMON$VIEW_LESS)
              : t(I18nKey.COMMON$VIEW_MORE)}
          </button>
        </div>
      )}
    </section>
  );
}
