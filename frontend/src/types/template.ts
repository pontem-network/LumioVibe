export type TemplateCategory = "starter" | "defi" | "nft";
export type TemplateDifficulty = "beginner" | "intermediate" | "advanced";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  features: string[];
  default: boolean;
  image_url: string | null;
}

export interface TemplatesResponse {
  templates: Template[];
}

export const CATEGORY_GRADIENTS: Record<TemplateCategory, string> = {
  starter: "from-green-500 to-green-700",
  defi: "from-blue-500 to-blue-700",
  nft: "from-purple-500 to-purple-700",
};

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  starter: "Starter",
  defi: "DeFi",
  nft: "NFT",
};

export const DIFFICULTY_LEVELS: Record<TemplateDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export const DIFFICULTY_LABELS: Record<TemplateDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
