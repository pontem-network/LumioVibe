import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { useMicroagentManagementStore } from "#/state/microagent-management-store";
import { GitRepository } from "#/types/git";

interface MicroagentManagementLearnThisRepoProps {
  repository: GitRepository;
}

export function MicroagentManagementLearnThisRepo({
  repository,
}: MicroagentManagementLearnThisRepoProps) {
  const { setLearnThisRepoModalVisible, setSelectedRepository } =
    useMicroagentManagementStore();
  const { t } = useTranslation();

  const handleClick = () => {
    setLearnThisRepoModalVisible(true);
    setSelectedRepository(repository);
  };

  return (
    <div
      className="flex items-center justify-center rounded-lg bg-[#1a1a1a]/50 backdrop-blur-sm border border-dashed border-[#3a3a3a] p-4 hover:bg-[#2a2a2a]/70 hover:border-[#AE7993] transition-all duration-300 cursor-pointer"
      onClick={handleClick}
      data-testid="learn-this-repo-trigger"
    >
      <span className="text-[16px] font-normal text-gradient">
        {t(I18nKey.MICROAGENT_MANAGEMENT$LEARN_THIS_REPO)}
      </span>
    </div>
  );
}
