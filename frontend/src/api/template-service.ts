import { openHands } from "./open-hands-axios";
import { Template, TemplatesResponse } from "#/types/template";

export class TemplateService {
  static async getTemplates(): Promise<Template[]> {
    const { data } = await openHands.get<TemplatesResponse>("/api/templates");
    return data.templates;
  }

  static async getTemplate(templateId: string): Promise<Template> {
    const { data } = await openHands.get<Template>(
      `/api/templates/${templateId}`,
    );
    return data;
  }

  static getTemplateImageUrl(templateId: string): string {
    const baseURL = `${window.location.protocol}//${import.meta.env.VITE_BACKEND_BASE_URL || window?.location.host}`;
    return `${baseURL}/api/templates/${templateId}/image`;
  }
}
