import { useQuery } from "@tanstack/react-query";
import {
  listDeployments,
  getDeployment,
  getDeploymentRates,
  DeploymentStatus,
} from "#/api/deployment-service";

export function useDeployments() {
  return useQuery<DeploymentStatus[]>({
    queryKey: ["deployments"],
    queryFn: listDeployments,
    refetchInterval: 10000,
  });
}

export function useDeployment(conversationId: string | null) {
  return useQuery<DeploymentStatus>({
    queryKey: ["deployment", conversationId],
    queryFn: () => getDeployment(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useDeploymentRates() {
  return useQuery({
    queryKey: ["deployment-rates"],
    queryFn: getDeploymentRates,
    staleTime: 60000,
  });
}
