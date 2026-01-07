import { PrefetchPageLinks } from "react-router";
import { HomeHeader } from "#/components/features/home/home-header/home-header";
import { RecentConversations } from "#/components/features/home/recent-conversations/recent-conversations";
import { TemplateGrid } from "#/components/features/home/templates";
import { usePaginatedConversations } from "#/hooks/query/use-paginated-conversations";

<PrefetchPageLinks page="/conversations/:conversationId" />;

function HomeScreen() {
  const { data: conversationsList, isPending } = usePaginatedConversations(10);
  const conversations =
    conversationsList?.pages.flatMap((page) => page.results) ?? [];
  const hasApps = conversations.length > 0;

  // Wait for initial load to determine layout
  const isInitialLoading = isPending && !conversationsList;

  return (
    <div
      data-testid="home-screen"
      className="px-0 pt-4 bg-transparent h-full flex flex-col pt-[35px] overflow-y-auto rounded-xl lg:px-[42px] lg:pt-[42px] custom-scrollbar-always"
    >
      <HomeHeader />

      <div className="pt-[25px] flex justify-center">
        <div
          id="new_conversation_section"
          className="flex flex-col gap-6 px-6 w-full lg:px-0 lg:max-w-[1000px]"
          data-testid="home-screen-new-conversation-section"
        >
          {isInitialLoading && <TemplateGrid />}
          {!isInitialLoading && hasApps && (
            <>
              <RecentConversations />
              <TemplateGrid compact />
            </>
          )}
          {!isInitialLoading && !hasApps && <TemplateGrid showNewAppButton />}
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
