import { openHands } from "./open-hands-axios";

export interface DeploymentStatus {
  conversation_id: string;
  container_id: string | null;
  title: string | null;
  project_dir: string | null;
  status: "stopped" | "starting" | "running" | "error" | "redeploying";
  contract_address: string | null;
  deployer_address: string | null;
  app_port: number | null;
  app_url: string | null;
  started_at: string | null;
  stopped_at: string | null;
  total_runtime_seconds: number;
  total_cost: number;
  error_message: string | null;
  last_deploy_at: string | null;
  deploy_count: number;
  created_at: string;
  is_deployable: boolean;
  uptime_seconds?: number;
  current_session_cost?: number;
  hourly_rate: number;
}

export interface DeploymentRates {
  hourly_rate: number;
  currency: string;
}

export interface StartDeploymentResult {
  success: boolean;
  app_url?: string;
  port?: number;
  error?: string;
}

export interface RedeployResult {
  success: boolean;
  contract_address?: string;
  app_url?: string;
  error?: string;
}

export async function listDeployments(): Promise<DeploymentStatus[]> {
  const response = await openHands.get<{ deployments: DeploymentStatus[] }>(
    "/api/deployments",
  );
  return response.data.deployments;
}

export async function getDeployment(
  conversationId: string,
): Promise<DeploymentStatus> {
  const response = await openHands.get<DeploymentStatus>(
    `/api/deployments/${conversationId}`,
  );
  return response.data;
}

export async function startDeployment(
  conversationId: string,
): Promise<StartDeploymentResult> {
  const response = await openHands.get<StartDeploymentResult>(
    `/api/deployments/${conversationId}/start`,
  );
  return response.data;
}

export async function stopDeployment(
  conversationId: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await openHands.get<{ success: boolean; error?: string }>(
    `/api/deployments/${conversationId}/stop`,
  );
  return response.data;
}

export async function redeployContract(
  conversationId: string,
): Promise<RedeployResult> {
  const response = await openHands.post<RedeployResult>(
    `/api/deployments/${conversationId}/redeploy`,
  );
  return response.data;
}

export async function getDeploymentRates(): Promise<DeploymentRates> {
  const response = await openHands.get<DeploymentRates>(
    "/api/deployments/config/rates",
  );
  return response.data;
}
