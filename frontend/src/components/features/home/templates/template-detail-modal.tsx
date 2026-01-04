import React from "react";
import { useNavigate } from "react-router";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalBody } from "#/components/shared/modals/modal-body";
import { BrandButton } from "#/components/features/settings/brand-button";
import {
  Template,
  CATEGORY_GRADIENTS,
  CATEGORY_LABELS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
} from "#/types/template";
import { TemplateService } from "#/api/template-service";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import CloseIcon from "#/icons/close.svg?react";

interface TemplateDetailModalProps {
  template: Template;
  onClose: () => void;
}

export function TemplateDetailModal({
  template,
  onClose,
}: TemplateDetailModalProps) {
  const navigate = useNavigate();
  const { mutate: createConversation, isPending } = useCreateConversation();
  const [imageError, setImageError] = React.useState(false);

  const hasImage = template.image_url && !imageError;

  const difficultyDots = React.useMemo(() => {
    const level = DIFFICULTY_LEVELS[template.difficulty];
    return Array.from({ length: 3 }, (_, i) => i < level);
  }, [template.difficulty]);

  const handleUseTemplate = () => {
    createConversation(
      { templateId: template.id },
      {
        onSuccess: (data) => {
          navigate(`/conversations/${data.conversation_id}`);
        },
      },
    );
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalBody
        width="medium"
        className="items-start max-w-[500px] w-[500px] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h2 className="text-xl font-bold text-white">{template.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Preview Image */}
        <div className="w-full h-48 rounded-lg overflow-hidden">
          {hasImage ? (
            <img
              src={TemplateService.getTemplateImageUrl(template.id)}
              alt={template.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${CATEGORY_GRADIENTS[template.category]} flex items-center justify-center`}
            >
              <span className="text-6xl font-bold text-white/30">
                {template.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-white/70 leading-relaxed">
          {template.description}
        </p>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 w-full">
          {/* Difficulty */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span className="text-xs text-white/50">Difficulty:</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {difficultyDots.map((filled, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      filled ? "bg-white" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-white/80">
                {DIFFICULTY_LABELS[template.difficulty]}
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span className="text-xs text-white/50">Category:</span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r ${CATEGORY_GRADIENTS[template.category]} text-white`}
            >
              {CATEGORY_LABELS[template.category]}
            </span>
          </div>
        </div>

        {/* Features */}
        {template.features.length > 0 && (
          <div className="w-full">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <h4 className="text-xs text-white/50 mb-2">Features:</h4>
            <div className="flex flex-wrap gap-2">
              {template.features.map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 text-xs text-white/70 bg-white/5 rounded-md border border-white/10"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="w-full pt-2">
          <BrandButton
            variant="primary"
            type="button"
            onClick={handleUseTemplate}
            isDisabled={isPending}
            className="w-full justify-center"
          >
            {isPending ? "Creating..." : "Use This Template"}
          </BrandButton>
        </div>
      </ModalBody>
    </ModalBackdrop>
  );
}
