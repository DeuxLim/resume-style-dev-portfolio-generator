import { defaultPortfolioLayout } from "../../../shared/defaults/portfolio";
import type {
	EditablePortfolio,
	PortfolioSectionKey,
	PublicPortfolio,
} from "../../../shared/types/portfolio.types";

type PortfolioLike = Pick<PublicPortfolio, "layout" | "customSections"> | null | undefined;

const hasCustomSections = (portfolio: PortfolioLike): boolean =>
	Boolean(portfolio?.customSections?.length);

export const isSectionVisibleInPortfolio = (
	sectionKey: PortfolioSectionKey,
	portfolio: PortfolioLike,
): boolean => {
	if (sectionKey === "custom") {
		return hasCustomSections(portfolio);
	}
	return true;
};

export const getVisibleSectionOrder = (
	portfolio: PortfolioLike,
): PortfolioSectionKey[] => {
	const rawOrder = portfolio?.layout?.sectionOrder?.length
		? portfolio.layout.sectionOrder
		: defaultPortfolioLayout.sectionOrder;

	return rawOrder
		.filter((key, index, arr) => arr.indexOf(key) === index)
		.filter((key) => isSectionVisibleInPortfolio(key, portfolio));
};

export const getVisibleHiddenSections = (
	portfolio: Pick<EditablePortfolio, "layout" | "customSections">,
): PortfolioSectionKey[] => {
	const visibleOrder = new Set(getVisibleSectionOrder(portfolio));
	return defaultPortfolioLayout.sectionOrder
		.filter((section) => isSectionVisibleInPortfolio(section, portfolio))
		.filter((section) => !visibleOrder.has(section));
};
