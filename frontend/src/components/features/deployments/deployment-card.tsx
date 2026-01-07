/* eslint-disable i18next/no-literal-string */
import React from "react";
import { DeploymentStatus } from "#/api/deployment-service";
import { cn } from "#/utils/utils";
import PlayIcon from "#/icons/play-solid.svg?react";
import StopIcon from "#/icons/close.svg?react";
import ExternalLinkIcon from "#/icons/export.svg?react";
import "./deployment.css";

interface DeploymentCardProps {
  deployment: DeploymentStatus;
  conversationTitle?: string;
  onStart: () => void;
  onStop: () => void;
  onClick: () => void;
  isStarting?: boolean;
  isStopping?: boolean;
  hourlyRate: number;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatCost(cost: number): string {
  return cost.toFixed(4);
}

export function DeploymentCard({
  deployment,
  conversationTitle,
  onStart,
  onStop,
  onClick,
  isStarting,
  isStopping,
  hourlyRate,
}: DeploymentCardProps) {
  const isRunning = deployment.status === "running";
  const isError = deployment.status === "error";
  const isLoading =
    deployment.status === "starting" ||
    deployment.status === "redeploying" ||
    isStarting ||
    isStopping;

  const getStatusColor = () => {
    if (isRunning) return "bg-green-500";
    if (isError) return "bg-red-500";
    return "bg-gray-500";
  };

  const getStatusText = () => {
    if (isStarting) return "Starting...";
    if (isStopping) return "Stopping...";
    if (deployment.status === "starting") return "Starting...";
    if (deployment.status === "redeploying") return "Redeploying...";
    if (isRunning) {
      const uptime = deployment.uptime_seconds
        ? formatUptime(deployment.uptime_seconds)
        : "";
      return `Running ${uptime}`;
    }
    if (isError) return "Error";
    return "Stopped";
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      onStop();
    } else if (!isLoading) {
      onStart();
    }
  };

  const handleOpenApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deployment.app_url) {
      window.open(deployment.app_url, "_blank");
    }
  };

  const title =
    conversationTitle ??
    deployment.project_dir ??
    deployment.title ??
    deployment.conversation_id;

  return (
    <div
      className={cn(
        "app-card p-4 rounded-lg border border-gray-700 bg-[#1a1a1a] hover:bg-[#222] cursor-pointer transition-all",
        isError && "border-red-500/50",
        isRunning && "border-green-500/50",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center text-info">
          <div className={cn("w-3 h-3 rounded-full", statusColor)} />
          <div className="text-info-c">
            <h3 className="app-title font-medium text-white">{title}</h3>
            <p className="text-sm text-gray-400">{statusText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleActionClick}
            disabled={isLoading}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              isRunning
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30",
              isLoading && "opacity-50 cursor-not-allowed",
            )}
          >
            {isRunning ? (
              <>
                <StopIcon width={12} height={12} />
                Stop
              </>
            ) : (
              <>
                <PlayIcon width={12} height={12} />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {isRunning && deployment.app_url && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <button
            type="button"
            onClick={handleOpenApp}
            className="w-full py-2 px-3 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <ExternalLinkIcon width={14} height={14} />
            Open App: {deployment.app_url}
          </button>
        </div>
      )}

      {isRunning && deployment.current_session_cost !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Session cost:</span>
            <span className="text-white">
              {formatCost(deployment.current_session_cost)} LUM
            </span>
          </div>
        </div>
      )}

      {!isRunning && !isError && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Rate:</span>
            <span className="text-gray-300">{hourlyRate} LUM/day</span>
          </div>
        </div>
      )}

      {isError && deployment.error_message && (
        <div className="mt-3 pt-3 border-t border-red-500/30">
          <p className="text-sm text-red-400 line-clamp-2">
            {deployment.error_message}
          </p>
        </div>
      )}
    </div>
  );
}
