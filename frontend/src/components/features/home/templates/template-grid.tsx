import React from "react";
import { useNavigate } from "react-router";
import { useTemplates } from "#/hooks/query/use-templates";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { Template } from "#/types/template";
import { TemplateCard } from "./template-card";
import { TemplateDetailModal } from "./template-detail-modal";
import PlusIcon from "#/icons/u-plus.svg?react";

function TemplateGridSkeleton({ compact }: { compact?: boolean }) {
  const skeletonCount = compact ? 5 : 4;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
      <div
        className={`grid gap-3 ${
          compact
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]/95 overflow-hidden"
          >
            <div className="h-32 bg-white/5 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TemplateGridProps {
  compact?: boolean;
  showNewAppButton?: boolean;
}

export function TemplateGrid({
  compact = false,
  showNewAppButton = false,
}: TemplateGridProps) {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useTemplates();
  const { mutate: createConversation, isPending } = useCreateConversation();
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<Template | null>(null);

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

  if (isLoading) {
    return <TemplateGridSkeleton compact={compact} />;
  }

  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <h2 className="text-xs leading-4 text-white font-bold">
            Create from template
          </h2>
          {showNewAppButton && (
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
          )}
        </div>
        <div
          className={`grid gap-3 ${
            compact
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          }`}
        >
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={setSelectedTemplate}
            />
          ))}
        </div>
      </div>

      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </>
  );
}
