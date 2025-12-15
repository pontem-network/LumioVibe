/* eslint-disable i18next/no-literal-string */
import React from "react";
import { useNavigate } from "react-router";
import {
  useDeployments,
  useDeploymentRates,
} from "#/hooks/query/use-deployments";
import {
  useStartDeployment,
  useStopDeployment,
  useRedeployContract,
} from "#/hooks/mutation/use-deployment-actions";
import { useClickOutsideElement } from "#/hooks/use-click-outside-element";
import { LoadingSpinner } from "#/components/shared/loading-spinner";
import { DeploymentCard } from "./deployment-card";
import { DeploymentDetails } from "./deployment-details";
import { DeploymentStatus } from "#/api/deployment-service";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";

interface DeploymentsPanelProps {
  onClose: () => void;
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "default";
}

function ConfirmModal({
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmModalProps) {
  const getButtonClass = () => {
    if (variant === "danger") return "bg-red-500 hover:bg-red-600";
    if (variant === "warning")
      return "bg-yellow-500 hover:bg-yellow-600 text-black";
    return "bg-blue-500 hover:bg-blue-600";
  };
  const buttonClass = getButtonClass();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-white transition-colors ${buttonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeploymentsPanel({ onClose }: DeploymentsPanelProps) {
  const ref = useClickOutsideElement<HTMLDivElement>(onClose);
  const navigate = useNavigate();

  const { data: deployments, isLoading, error } = useDeployments();
  const { data: rates } = useDeploymentRates();

  const { mutate: startDeployment, isPending: isStarting } =
    useStartDeployment();
  const { mutate: stopDeployment, isPending: isStopping } = useStopDeployment();
  const { mutate: redeployContract, isPending: isRedeploying } =
    useRedeployContract();

  const [selectedDeployment, setSelectedDeployment] =
    React.useState<DeploymentStatus | null>(null);
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  const [confirmStart, setConfirmStart] = React.useState<string | null>(null);
  const [confirmRedeploy, setConfirmRedeploy] = React.useState<string | null>(
    null,
  );

  const hourlyRate = rates?.hourly_rate ?? 0.02;

  const handleStart = (conversationId: string) => {
    setConfirmStart(conversationId);
  };

  const handleConfirmStart = () => {
    if (!confirmStart) return;
    setActioningId(confirmStart);
    startDeployment(confirmStart, {
      onSuccess: (result) => {
        if (result.app_url) {
          displaySuccessToast(`App started at ${result.app_url}`);
        }
        setActioningId(null);
      },
      onError: (err) => {
        displayErrorToast(`Failed to start: ${err.message}`);
        setActioningId(null);
      },
    });
    setConfirmStart(null);
  };

  const handleStop = (conversationId: string) => {
    setActioningId(conversationId);
    stopDeployment(conversationId, {
      onSuccess: () => {
        displaySuccessToast("App stopped");
        setActioningId(null);
      },
      onError: (err) => {
        displayErrorToast(`Failed to stop: ${err.message}`);
        setActioningId(null);
      },
    });
  };

  const handleRedeploy = (conversationId: string) => {
    setConfirmRedeploy(conversationId);
  };

  const handleConfirmRedeploy = () => {
    if (!confirmRedeploy) return;
    setActioningId(confirmRedeploy);
    redeployContract(confirmRedeploy, {
      onSuccess: (result) => {
        if (result.contract_address) {
          displaySuccessToast(
            `Contract redeployed to ${result.contract_address}`,
          );
        }
        setActioningId(null);
      },
      onError: (err) => {
        displayErrorToast(`Failed to redeploy: ${err.message}`);
        setActioningId(null);
      },
    });
    setConfirmRedeploy(null);
  };

  const handleOpenChat = (conversationId: string) => {
    navigate(`/conversations/${conversationId}`);
    onClose();
  };

  if (selectedDeployment) {
    const deployment = deployments?.find(
      (d) => d.conversation_id === selectedDeployment.conversation_id,
    );
    if (deployment) {
      return (
        <div
          ref={ref}
          data-testid="deployments-panel"
          className="w-full md:w-[400px] h-full border border-[#2a2a2a] bg-[#0a0a0a]/95 backdrop-blur-sm rounded-lg overflow-hidden absolute"
        >
          <DeploymentDetails
            deployment={deployment}
            onStart={() => handleStart(deployment.conversation_id)}
            onStop={() => handleStop(deployment.conversation_id)}
            onRedeploy={() => handleRedeploy(deployment.conversation_id)}
            onOpenChat={() => handleOpenChat(deployment.conversation_id)}
            onBack={() => setSelectedDeployment(null)}
            isStarting={
              isStarting && actioningId === deployment.conversation_id
            }
            isStopping={
              isStopping && actioningId === deployment.conversation_id
            }
            isRedeploying={
              isRedeploying && actioningId === deployment.conversation_id
            }
          />

          {confirmStart && (
            <ConfirmModal
              title="Start App"
              message={`Starting this app will cost ${hourlyRate} LUM per hour. Are you sure you want to continue?`}
              confirmText="Start"
              onConfirm={handleConfirmStart}
              onCancel={() => setConfirmStart(null)}
              variant="warning"
            />
          )}

          {confirmRedeploy && (
            <ConfirmModal
              title="Redeploy Contract"
              message="This will create a new Lumio account and deploy the contract to a new address. The old contract will remain on the blockchain. Continue?"
              confirmText="Redeploy"
              onConfirm={handleConfirmRedeploy}
              onCancel={() => setConfirmRedeploy(null)}
              variant="warning"
            />
          )}
        </div>
      );
    }
  }

  return (
    <div
      ref={ref}
      data-testid="deployments-panel"
      className="w-full md:w-[400px] h-full border border-[#2a2a2a] bg-[#0a0a0a]/95 backdrop-blur-sm rounded-lg overflow-y-auto absolute custom-scrollbar-always"
    >
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">My Apps</h2>
        <p className="text-sm text-gray-400 mt-1">
          Deploy and manage your applications
        </p>
      </div>

      {isLoading && (
        <div className="w-full h-64 flex justify-center items-center">
          <LoadingSpinner size="small" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-400">{error.message}</p>
        </div>
      )}

      {!isLoading && deployments?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 px-4">
          <p className="text-gray-400 text-center">
            No deployable apps yet. Create a conversation with a frontend to see
            it here.
          </p>
        </div>
      )}

      <div className="p-4 space-y-3">
        {deployments?.map((deployment) => (
          <DeploymentCard
            key={deployment.conversation_id}
            deployment={deployment}
            onStart={() => handleStart(deployment.conversation_id)}
            onStop={() => handleStop(deployment.conversation_id)}
            onClick={() => setSelectedDeployment(deployment)}
            isStarting={
              isStarting && actioningId === deployment.conversation_id
            }
            isStopping={
              isStopping && actioningId === deployment.conversation_id
            }
            hourlyRate={hourlyRate}
          />
        ))}
      </div>

      {confirmStart && (
        <ConfirmModal
          title="Start App"
          message={`Starting this app will cost ${hourlyRate} LUM per hour. Are you sure you want to continue?`}
          confirmText="Start"
          onConfirm={handleConfirmStart}
          onCancel={() => setConfirmStart(null)}
          variant="warning"
        />
      )}

      {confirmRedeploy && (
        <ConfirmModal
          title="Redeploy Contract"
          message="This will create a new Lumio account and deploy the contract to a new address. The old contract will remain on the blockchain. Continue?"
          confirmText="Redeploy"
          onConfirm={handleConfirmRedeploy}
          onCancel={() => setConfirmRedeploy(null)}
          variant="warning"
        />
      )}
    </div>
  );
}
