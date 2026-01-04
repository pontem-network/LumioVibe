import React from "react";
import {
  Template,
  CATEGORY_GRADIENTS,
  CATEGORY_LABELS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
} from "#/types/template";
import { TemplateService } from "#/api/template-service";

interface TemplateCardProps {
  template: Template;
  onClick: (template: Template) => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const [imageError, setImageError] = React.useState(false);
  const hasImage = template.image_url && !imageError;

  const difficultyDots = React.useMemo(() => {
    const level = DIFFICULTY_LEVELS[template.difficulty];
    return Array.from({ length: 3 }, (_, i) => i < level);
  }, [template.difficulty]);

  return (
    <button
      type="button"
      onClick={() => onClick(template)}
      className="group relative flex flex-col rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]/95 overflow-hidden transition-all duration-300 hover:border-[#3a3a3a] hover:bg-[#0a0a0a] cursor-pointer text-left"
    >
      {/* Image or Gradient */}
      <div className="relative h-32 w-full overflow-hidden">
        {hasImage ? (
          <img
            src={TemplateService.getTemplateImageUrl(template.id)}
            alt={template.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${CATEGORY_GRADIENTS[template.category]} flex items-center justify-center`}
          >
            <span className="text-4xl font-bold text-white/30">
              {template.name.charAt(0)}
            </span>
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-black/50 text-white/80 backdrop-blur-sm">
            {CATEGORY_LABELS[template.category]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold text-white leading-tight">
          {template.name}
        </h3>

        {/* Difficulty indicator */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {difficultyDots.map((filled, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  filled ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-white/50">
            {DIFFICULTY_LABELS[template.difficulty]}
          </span>
        </div>
      </div>
    </button>
  );
}
