import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startDeployment,
  stopDeployment,
  redeployContract,
} from "#/api/deployment-service";

export function useStartDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startDeployment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["deployment"] });
    },
  });
}

export function useStopDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stopDeployment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["deployment"] });
    },
  });
}

export function useRedeployContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: redeployContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["deployment"] });
    },
  });
}
