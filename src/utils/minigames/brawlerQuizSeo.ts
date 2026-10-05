import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { getMinigameMessages } from "../../i18n/minigameMessages";

export const brawlerQuizSocialImage = "/images/minigames/brawler-quiz-100.png";
const siteUrl = "https://www.brawl-o1.site";
const quizPath = "/minigames/brawler-quiz";

export function getBrawlerQuizStructuredData(locale: Locale) {
  const copy = getMinigameMessages(locale);
  const common = getMessages(locale).common;
  const url = siteUrl + localizedHref(locale, quizPath);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url + "#page",
        url,
        name: copy.quizTitle,
        description: copy.quizMetaDescription,
        inLanguage: numberLocales[locale],
        mainEntity: { "@id": url + "#game" },
        breadcrumb: { "@id": url + "#breadcrumb" },
        isPartOf: { "@type": "WebSite", name: "Brawl Status KR", url: siteUrl },
      },
      {
        "@type": "WebApplication",
        "@id": url + "#game",
        name: copy.quizTitle,
        description: copy.quizDescription,
        url,
        image: siteUrl + brawlerQuizSocialImage,
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        inLanguage: numberLocales[locale],
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        "@id": url + "#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: common.home, item: siteUrl + localizedHref(locale, "/") },
          { "@type": "ListItem", position: 2, name: copy.hubTitle, item: siteUrl + localizedHref(locale, "/minigames") },
          { "@type": "ListItem", position: 3, name: copy.quizTitle, item: url },
        ],
      },
    ],
  };
}
