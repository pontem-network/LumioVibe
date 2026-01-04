import { useQuery } from "@tanstack/react-query";
import { TemplateService } from "#/api/template-service";

export const useTemplates = () =>
  useQuery({
    queryKey: ["templates"],
    queryFn: () => TemplateService.getTemplates(),
    staleTime: 1000 * 60 * 10, // 10 minutes - templates rarely change
  });
