/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DeploymentStatus } from "#/api/deployment-service";
import { cn } from "#/utils/utils";
import PlayIcon from "#/icons/play-solid.svg?react";
import StopIcon from "#/icons/close.svg?react";
import ExternalLinkIcon from "#/icons/export.svg?react";
import RefreshIcon from "#/icons/refresh.svg?react";
import ChevronLeftIcon from "#/icons/chevron-left-small.svg?react";

interface DeploymentDetailsProps {
  deployment: DeploymentStatus;
  conversationTitle?: string;
  onStart: () => void;
  onStop: () => void;
  onRedeploy: () => void;
  onOpenChat: () => void;
  onBack: () => void;
  isStarting?: boolean;
  isStopping?: boolean;
  isRedeploying?: boolean;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatCost(cost: number): string {
  return cost.toFixed(4);
}

export function DeploymentDetails({
  deployment,
  conversationTitle,
  onStart,
  onStop,
  onRedeploy,
  onOpenChat,
  onBack,
  isStarting,
  isStopping,
  isRedeploying,
}: DeploymentDetailsProps) {
  const isRunning = deployment.status === "running";
  const isError = deployment.status === "error";
  const isLoading =
    deployment.status === "starting" ||
    deployment.status === "redeploying" ||
    isStarting ||
    isStopping ||
    isRedeploying;

  const getStatusColor = () => {
    if (isRunning) return "text-green-400";
    if (isError) return "text-red-400";
    return "text-gray-400";
  };
  const statusColor = getStatusColor();

  const statusText =
    deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon width={20} height={20} className="text-gray-400" />
        </button>
        <h2 className="font-semibold text-white">
          {conversationTitle || `App ${deployment.conversation_id.slice(0, 8)}`}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Status</span>
            <span className={cn("font-medium", statusColor)}>{statusText}</span>
          </div>

          {isRunning && deployment.uptime_seconds !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Uptime</span>
              <span className="text-white">
                {formatUptime(deployment.uptime_seconds)}
              </span>
            </div>
          )}

          {deployment.app_url && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">App URL</span>
              <a
                href={deployment.app_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {deployment.app_url}
                <ExternalLinkIcon width={12} height={12} />
              </a>
            </div>
          )}

          {deployment.contract_address && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Contract</span>
              <span className="text-white font-mono text-sm">
                {deployment.contract_address.slice(0, 10)}...
                {deployment.contract_address.slice(-8)}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#1a1a1a] rounded-lg space-y-3">
          <h3 className="font-medium text-white">Costs</h3>

          {isRunning && deployment.current_session_cost !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">This session</span>
              <span className="text-white">
                {formatCost(deployment.current_session_cost)} LUM
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Total spent</span>
            <span className="text-white">
              {formatCost(deployment.total_cost)} LUM
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Rate</span>
            <span className="text-yellow-400">
              {deployment.hourly_rate} LUM/hour
            </span>
          </div>
        </div>

        {isError && deployment.error_message && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <h3 className="font-medium text-red-400 mb-2">Error</h3>
            <p className="text-sm text-red-300 whitespace-pre-wrap">
              {deployment.error_message}
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 space-y-3">
        <div className="flex gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              disabled={isLoading}
              className={cn(
                "flex-1 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
                "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                isLoading && "opacity-50 cursor-not-allowed",
              )}
            >
              <StopIcon width={16} height={16} />
              {isStopping ? "Stopping..." : "Stop App"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={isLoading}
              className={cn(
                "flex-1 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
                "bg-green-500/20 text-green-400 hover:bg-green-500/30",
                isLoading && "opacity-50 cursor-not-allowed",
              )}
            >
              <PlayIcon width={16} height={16} />
              {isStarting ? "Starting..." : "Start App"}
            </button>
          )}

          {isRunning && deployment.app_url && (
            <a
              href={deployment.app_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              <ExternalLinkIcon width={16} height={16} />
              Open App
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={onRedeploy}
          disabled={isLoading}
          className={cn(
            "w-full py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2",
            "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30",
            isLoading && "opacity-50 cursor-not-allowed",
          )}
        >
          <RefreshIcon width={16} height={16} />
          {isRedeploying ? "Redeploying..." : "Redeploy to New Address"}
        </button>

        <button
          type="button"
          onClick={onOpenChat}
          className="w-full py-2 rounded-md font-medium transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          Open Chat
        </button>
      </div>
    </div>
  );
}
