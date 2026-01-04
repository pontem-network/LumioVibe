import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Conversation } from "#/api/open-hands.types";
import { formatTimeDelta } from "#/utils/format-time-delta";
import { ConversationStatusIndicator } from "./conversation-status-indicator";
import { I18nKey } from "#/i18n/declaration";

interface AppCardProps {
  conversation: Conversation;
}

function getConversationImageUrl(conversationId: string): string {
  const baseURL = `${window.location.protocol}//${import.meta.env.VITE_BACKEND_BASE_URL || window?.location.host}`;
  return `${baseURL}/api/conversations/${conversationId}/image`;
}

export function AppCard({ conversation }: AppCardProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = React.useState(false);

  const imageUrl = getConversationImageUrl(conversation.conversation_id);

  return (
    <Link to={`/conversations/${conversation.conversation_id}`}>
      <div className="group flex flex-col rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]/95 overflow-hidden transition-all duration-300 hover:border-[#3a3a3a] hover:bg-[#0a0a0a] cursor-pointer h-full">
        {/* Preview image or gradient fallback */}
        <div className="h-24 bg-gradient-to-br from-[#AE7993]/30 to-[#0E69A9]/30 flex items-center justify-center relative overflow-hidden">
          {!imageError ? (
            <img
              src={imageUrl}
              alt={conversation.title || "App preview"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-3xl font-bold text-white/20">
              {(conversation.title || "App").charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <ConversationStatusIndicator
              conversationStatus={conversation.status}
            />
            <h3 className="text-sm font-semibold text-white leading-tight truncate flex-1">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              {conversation.title || "Untitled App"}
            </h3>
          </div>

          {/* Timestamp */}
          {(conversation.created_at || conversation.last_updated_at) && (
            <span className="text-xs text-white/50">
              {formatTimeDelta(
                conversation.created_at || conversation.last_updated_at,
              )}{" "}
              {t(I18nKey.CONVERSATION$AGO)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
