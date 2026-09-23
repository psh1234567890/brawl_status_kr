import type { Locale } from "./config";

type DocumentBlock =
  | Readonly<{ type: "paragraph"; text: string }>
  | Readonly<{ type: "list"; items: readonly string[] }>
  | Readonly<{ type: "action"; action: "githubIssues"; label: string }>;

type DocumentSection = Readonly<{
  title: string;
  blocks: readonly DocumentBlock[];
}>;

type DocumentPage = Readonly<{
  metadata: Readonly<{
    title: string;
    description: string;
  }>;
  back?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  effectiveDate?: string;
  intro?: string;
  sections: readonly DocumentSection[];
}>;

export type DocumentPageMessages = Readonly<{
  about: DocumentPage;
  methodology: DocumentPage;
  privacy: DocumentPage;
  terms: DocumentPage;
  contact: DocumentPage;
}>;

export const documentPageMessages: Record<Locale, DocumentPageMessages> = {
  ko: {
    about: {
      metadata: {
        title: "서비스 소개",
        description:
          "Brawl Status KR의 전적 검색, 최근 전투 분석, 맵별 추천 브롤러, 스킨 카탈로그 기능을 소개합니다.",
      },
      back: "전적 검색으로 돌아가기",
      title: "Brawl Status KR 소개",
      intro:
        "Brawl Status KR은 브롤스타즈 플레이어가 자신의 전적과 보유 브롤러 상태를 한국어로 빠르게 확인할 수 있도록 만든 팬 제작 분석 도구입니다.",
      sections: [
        {
          title: "주요 기능",
          blocks: [
            {
              type: "list",
              items: [
                "플레이어 태그 기반 프로필과 최근 전투 기록 검색",
                "최근 25전 승률, 승패, 주력 모드, 전투 상세 확인",
                "보유 브롤러의 가젯, 스타파워, 하이퍼차지, 기어, 스킨 정보 표시",
                "DB에 저장된 전체 전투 표본 기반 맵별 추천 브롤러 제공",
                "브롤러별 스킨 카탈로그와 가격, 희귀도 검색",
              ],
            },
          ],
        },
        {
          title: "데이터 기준",
          blocks: [
            {
              type: "paragraph",
              text: "전투 기록은 공식 API가 제공하는 최근 최대 25경기 범위 안에서 수집됩니다. 더 정확한 누적 통계를 원한다면 25경기마다 한 번씩 검색하는 것을 권장합니다.",
            },
          ],
        },
        {
          title: "비공식 팬 사이트 안내",
          blocks: [
            {
              type: "paragraph",
              text: "이 사이트는 Supercell과 제휴, 후원, 승인 관계가 없는 비공식 팬 제작 서비스입니다. Brawl Stars 관련 명칭과 이미지는 각 권리자에게 속합니다.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "데이터 산정 방식",
        description:
          "Brawl Status KR의 검색 표본, 전투 중복 방지, 팀전과 쇼다운 집계, 추천 점수의 한계를 설명합니다.",
      },
      title: "데이터 산정 방식",
      eyebrow: "데이터 산정 방식",
      description:
        "추천과 누적 통계가 어떤 전투를 바탕으로 계산되는지, 무엇을 의미하지 않는지 공개합니다.",
      sections: [
        {
          title: "전체 이용자 공식 통계가 아닙니다",
          blocks: [
            {
              type: "paragraph",
              text: "이 사이트의 DB 통계는 플레이어 태그가 검색될 때 받은 최근 전투를 누적한 표본입니다. 검색이 많은 지역·실력대·커뮤니티 쪽으로 표본이 치우칠 수 있으며, 저장된 고유 태그 수는 고유 사용자 수와 다릅니다.",
            },
          ],
        },
        {
          title: "최근 최대 25경기를 저장합니다",
          blocks: [
            {
              type: "paragraph",
              text: "공식 전투 기록 응답은 최근 최대 25경기 범위입니다. 같은 태그를 다시 검색하면 전투 시간과 전투 지문에 걸린 UNIQUE 제약으로 이미 저장된 전투는 건너뜁니다. 전투 지문은 시간, 모드, 맵, 정렬된 참가자 태그를 사용합니다.",
            },
          ],
        },
        {
          title: "팀전과 쇼다운은 다르게 계산합니다",
          blocks: [
            {
              type: "list",
              items: [
                "일반 2팀 전투는 같은 전투 지문을 한 번만 선택한 뒤 양 팀 참가자를 펼쳐 승리 팀과 상대 팀의 결과를 계산합니다.",
                "듀오·트리오 쇼다운은 여러 팀이 있어도 API가 모든 상대의 개별 결과를 제공하지 않으므로 검색된 플레이어 관점의 순위만 사용합니다.",
                "친선전은 추천과 누적 승률 통계에서 제외합니다.",
              ],
            },
          ],
        },
        {
          title: "표본이 5판 이상일 때만 추천에 표시합니다",
          blocks: [
            {
              type: "paragraph",
              text: "맵·브롤러 조합이 5판 이상일 때 승률과 표본 수를 함께 보여줍니다. 추천 점수는 표본이 적을수록 승률을 낮춰 반영하는 내부 점수이며, 5판이 대표성을 보장한다는 뜻은 아닙니다. 화면 값은 최대 60초 캐시될 수 있습니다.",
            },
          ],
        },
        {
          title: "오류를 발견하셨나요?",
          blocks: [
            {
              type: "paragraph",
              text: "맵·모드 번역, 승패, 표본 수가 실제와 다르게 보이면 공개 저장소의 데이터 정확성 양식으로 알려주세요. 플레이어 태그는 재현에 필요한 경우에도 일부를 가려주세요.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "GitHub에서 피드백 남기기",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "개인정보처리방침",
        description:
          "Brawl Status KR의 개인정보 수집, 이용, 쿠키, 광고, 외부 API 사용에 관한 안내입니다.",
      },
      back: "전적 검색으로 돌아가기",
      title: "개인정보처리방침",
      effectiveDate: "시행일: 2026년 9월 22일",
      intro:
        "Brawl Status KR은 이용자의 개인정보를 불필요하게 수집하지 않으며, 서비스 제공과 품질 개선에 필요한 최소한의 정보만 처리합니다.",
      sections: [
        {
          title: "수집하는 정보",
          blocks: [
            {
              type: "list",
              items: [
                "이용자가 입력한 브롤스타즈 플레이어 태그",
                "공식 API를 통해 조회된 공개 게임 프로필과 최근 전투 기록",
                "서비스 보안과 오류 대응을 위한 기본 접속 로그",
                "문의 메일을 보낸 경우 이메일 주소와 문의 내용",
              ],
            },
          ],
        },
        {
          title: "정보 이용 목적",
          blocks: [
            {
              type: "list",
              items: [
                "플레이어 전적 검색과 최근 전투 기록 표시",
                "브롤러별 누적 승률과 맵별 추천 통계 계산",
                "오류 수정, 악성 요청 방지, 서비스 안정성 개선",
                "문의 응답과 기능 개선 검토",
              ],
            },
          ],
        },
        {
          title: "쿠키와 광고",
          blocks: [
            {
              type: "paragraph",
              text: "현재 서비스는 로그인 기능을 제공하지 않습니다. 향후 Google AdSense 등 광고 서비스가 적용될 경우, 광고 제공자는 쿠키 또는 유사 기술을 사용해 광고 노출과 성과 측정을 수행할 수 있습니다. 이용자는 브라우저 설정에서 쿠키를 제한하거나 삭제할 수 있습니다.",
            },
          ],
        },
        {
          title: "제3자 서비스",
          blocks: [
            {
              type: "paragraph",
              text: "플레이어 정보와 전투 기록 조회를 위해 Brawl Stars API 또는 API 프록시를 사용할 수 있습니다. 사이트 운영과 배포에는 Vercel, GitHub 등 외부 인프라가 사용될 수 있습니다.",
            },
            {
              type: "paragraph",
              text: "보유 스킨 보조 조회는 기본적으로 비활성화되어 있습니다. 운영자가 명시적으로 활성화한 경우에만 이용자가 검색한 공개 플레이어 태그가 Brawlace에 전달될 수 있으며, Jina Reader도 별도로 활성화한 경우에만 직접 조회 실패 시 같은 공개 스킨 페이지를 읽는 보조 경로로 사용됩니다. 전체 보유 스킨 보조 조회가 성공한 경우 결과는 같은 브라우저의 localStorage에 최대 24시간 임시 캐시될 수 있으며, 보조 provider가 비활성화된 경우 이 캐시는 조회에 사용하지 않습니다.",
            },
            {
              type: "paragraph",
              text: "맵·모드·브롤러·이벤트 도감 정보는 BrawlAPI에서 조회하며 이 요청에는 이용자가 입력한 플레이어 태그를 보내지 않습니다. 브롤러·맵·배지 등 일부 이미지는 Brawlify CDN에서 원격으로 불러오므로 브라우저가 해당 CDN에 이미지 요청을 보낼 수 있습니다.",
            },
          ],
        },
        {
          title: "보관 기간",
          blocks: [
            {
              type: "paragraph",
              text: "현재 자동 TTL 삭제는 적용하지 않습니다. 전투 기록과 통계 데이터는 서비스 제공과 통계 품질 유지를 위해 서비스 운영 기간 동안 보관되며, 서비스 종료·운영 데이터 재설정 또는 검증된 기록 요청을 처리하는 경우 삭제될 수 있습니다. 문의 메일은 문의 처리와 분쟁 대응에 필요한 기간 동안 보관됩니다.",
            },
            {
              type: "paragraph",
              text: "공개 플레이어 태그만으로 소유자를 확인할 수 없어 자동 삭제 기능은 제공하지 않습니다. 기록 관련 요청은 아래 문의처에서 운영자가 개별 검토합니다.",
            },
          ],
        },
        {
          title: "문의",
          blocks: [
            {
              type: "paragraph",
              text: "개인정보 관련 문의는 {email}으로 연락해 주세요.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "이용 안내",
        description:
          "Brawl Status KR 이용 시 알아야 할 데이터 기준, 비공식 서비스 고지, 책임 범위 안내입니다.",
      },
      back: "전적 검색으로 돌아가기",
      title: "이용 안내",
      sections: [
        {
          title: "서비스 성격",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR은 브롤스타즈 유저를 위한 비공식 팬 제작 분석 도구입니다. Supercell과 제휴, 후원, 승인 관계가 없으며 공식 서비스가 아닙니다.",
            },
          ],
        },
        {
          title: "데이터 정확도",
          blocks: [
            {
              type: "paragraph",
              text: "전적과 통계는 외부 API 응답과 이 서비스 DB에 저장된 전투 기록을 바탕으로 계산됩니다. API 지연, 누락, 게임 업데이트, 검색 주기 차이로 인해 실제 게임 정보와 다를 수 있습니다.",
            },
          ],
        },
        {
          title: "25경기 검색 권장",
          blocks: [
            {
              type: "paragraph",
              text: "공식 전투 기록은 최근 최대 25경기만 조회할 수 있습니다. 누적 통계를 더 정확하게 쌓고 싶다면 25경기마다 한 번씩 플레이어 태그를 검색하는 것을 권장합니다.",
            },
          ],
        },
        {
          title: "상표와 저작권",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, 브롤스타즈, 관련 이미지와 명칭은 각 권리자에게 속합니다. 이 사이트는 팬 편의를 위한 정보 제공 목적의 도구입니다.",
            },
          ],
        },
        {
          title: "문의",
          blocks: [
            {
              type: "paragraph",
              text: "오류 제보, 삭제 요청, 기타 문의는 {email}으로 연락해 주세요.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "문의",
        description:
          "Brawl Status KR의 버그 제보, 기능 건의, 운영 문의를 위한 연락처 안내입니다.",
      },
      back: "전적 검색으로 돌아가기",
      title: "문의",
      intro:
        "사이트 이용 중 오류를 발견했거나 기능 제안, 데이터 관련 문의가 있으면 아래 이메일로 연락해 주세요.",
      sections: [
        {
          title: "운영자 연락처",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "문의 시 포함하면 좋은 내용",
          blocks: [
            {
              type: "list",
              items: [
                "문제가 발생한 페이지 주소",
                "검색한 플레이어 태그",
                "오류 메시지 또는 화면 캡처",
                "사용한 기기와 브라우저 종류",
              ],
            },
          ],
        },
      ],
    },
  },
  en: {
    about: {
      metadata: {
        title: "About the Service",
        description:
          "Learn about Brawl Status KR's player search, recent battle analysis, map-based brawler recommendations, and skin catalog.",
      },
      back: "Back to player search",
      title: "About Brawl Status KR",
      intro:
        "Brawl Status KR is a fan-made analytics tool that helps Brawl Stars players quickly check their battle history and owned brawlers.",
      sections: [
        {
          title: "Key features",
          blocks: [
            {
              type: "list",
              items: [
                "Search profiles and recent battle history by player tag",
                "Review win rate, wins and losses, top mode, and battle details from the latest 25 battles",
                "View gadgets, Star Powers, Hypercharges, gears, and skin information for owned brawlers",
                "Get map-based brawler recommendations from all battle samples stored in the database",
                "Search the skin catalog by brawler, including prices and rarities",
              ],
            },
          ],
        },
        {
          title: "Data basis",
          blocks: [
            {
              type: "paragraph",
              text: "Battle history is collected from up to the latest 25 battles provided by the official API. For more accurate accumulated statistics, we recommend searching once every 25 battles.",
            },
          ],
        },
        {
          title: "Unofficial fan site notice",
          blocks: [
            {
              type: "paragraph",
              text: "This is an unofficial fan-made service with no affiliation, sponsorship, or approval from Supercell. Brawl Stars names and images belong to their respective rights holders.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Methodology",
        description:
          "How Brawl Status KR handles search-based samples, battle deduplication, team battles and Showdown aggregation, and the limits of recommendation scores.",
      },
      title: "Methodology",
      eyebrow: "Methodology",
      description:
        "This page explains which battles are used for recommendations and accumulated statistics, and what those figures do not mean.",
      sections: [
        {
          title: "These are not official statistics for all players",
          blocks: [
            {
              type: "paragraph",
              text: "The site's database statistics are accumulated from recent battles returned when player tags are searched. The sample may be biased toward regions, skill levels, or communities that search more often, and the number of unique stored tags is not the same as the number of unique users.",
            },
          ],
        },
        {
          title: "We store up to the latest 25 battles",
          blocks: [
            {
              type: "paragraph",
              text: "The official battle log response covers up to the latest 25 battles. When the same tag is searched again, battles already stored are skipped through UNIQUE constraints on battle time and battle fingerprint. The fingerprint uses time, mode, map, and sorted participant tags.",
            },
          ],
        },
        {
          title: "Team battles and Showdown are calculated differently",
          blocks: [
            {
              type: "list",
              items: [
                "For normal two-team battles, each battle fingerprint is selected once, then participants from both teams are expanded to calculate results for the winning and opposing teams.",
                "For Duo and Trio Showdown, even when there are multiple teams, the API does not provide each opponent's individual result, so only the placement from the searched player's perspective is used.",
                "Friendly battles are excluded from recommendations and accumulated win-rate statistics.",
              ],
            },
          ],
        },
        {
          title: "Recommendations appear only with at least 5 samples",
          blocks: [
            {
              type: "paragraph",
              text: "Win rate and sample count are shown when a map-brawler combination has at least 5 battles. The recommendation score is an internal score that discounts win rate more when the sample is small; 5 battles do not guarantee representativeness. Values shown on screen may be cached for up to 60 seconds.",
            },
          ],
        },
        {
          title: "Found an error?",
          blocks: [
            {
              type: "paragraph",
              text: "If map or mode translations, results, or sample counts look different from the actual game, report it through the data accuracy form in the public repository. Please partially redact player tags even when they are needed to reproduce the issue.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Leave feedback on GitHub",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Privacy Policy",
        description:
          "Information about Brawl Status KR's data collection and use, cookies, advertising, and external APIs.",
      },
      back: "Back to player search",
      title: "Privacy Policy",
      effectiveDate: "Effective date: September 22, 2026",
      intro:
        "Brawl Status KR does not collect personal information unnecessarily and processes only the minimum information needed to provide and improve the service.",
      sections: [
        {
          title: "Information we collect",
          blocks: [
            {
              type: "list",
              items: [
                "The Brawl Stars player tag entered by the user",
                "Public game profile and recent battle history retrieved through the official API",
                "Basic access logs for service security and error response",
                "Email address and inquiry content when a user sends an inquiry email",
              ],
            },
          ],
        },
        {
          title: "How we use information",
          blocks: [
            {
              type: "list",
              items: [
                "Search player records and display recent battle history",
                "Calculate accumulated win rates by brawler and recommendation statistics by map",
                "Fix errors, prevent abusive requests, and improve service stability",
                "Respond to inquiries and review feature improvements",
              ],
            },
          ],
        },
        {
          title: "Cookies and advertising",
          blocks: [
            {
              type: "paragraph",
              text: "The service currently does not provide login functionality. If advertising services such as Google AdSense are added in the future, ad providers may use cookies or similar technologies to serve ads and measure performance. Users can restrict or delete cookies in their browser settings.",
            },
          ],
        },
        {
          title: "Third-party services",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars API or an API proxy may be used to retrieve player information and battle history. External infrastructure such as Vercel and GitHub may be used to operate and deploy the site.",
            },
            {
              type: "paragraph",
              text: "Owned-skin auxiliary lookup is disabled by default. Only when the operator explicitly enables it may the public player tag searched by the user be sent to Brawlace; Jina Reader is used after a direct lookup failure only if its fallback is separately enabled. When a full owned-skin lookup succeeds, the result may be cached in the same browser's localStorage for up to 24 hours; this cache is not used when the supplemental provider is disabled.",
            },
            {
              type: "paragraph",
              text: "Catalog information for maps, modes, brawlers, and events is retrieved from BrawlAPI, and these requests do not send the player tag entered by the user. Some images, including brawlers, maps, and badges, are loaded remotely from the Brawlify CDN, so the user's browser may send image requests to that CDN.",
            },
          ],
        },
        {
          title: "Retention period",
          blocks: [
            {
              type: "paragraph",
              text: "No automatic TTL deletion is currently applied. Battle history and statistical data are retained while the service operates to provide the service and maintain statistical quality, and may be deleted when the service ends, operational data is reset, or a verified record request is handled. Inquiry emails are retained for the period needed to handle the inquiry and respond to disputes.",
            },
            {
              type: "paragraph",
              text: "Because ownership cannot be verified from a public player tag alone, automatic deletion is not provided. Requests concerning records are reviewed individually by the operator through the contact information below.",
            },
          ],
        },
        {
          title: "Contact",
          blocks: [
            {
              type: "paragraph",
              text: "For privacy-related inquiries, contact {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Terms of Use",
        description:
          "Data standards, unofficial-service notice, and scope of responsibility for using Brawl Status KR.",
      },
      back: "Back to player search",
      title: "Terms of Use",
      sections: [
        {
          title: "Nature of the service",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR is an unofficial fan-made analytics tool for Brawl Stars players. It is not affiliated with, sponsored by, or approved by Supercell and is not an official service.",
            },
          ],
        },
        {
          title: "Data accuracy",
          blocks: [
            {
              type: "paragraph",
              text: "Player records and statistics are calculated from external API responses and battle history stored in this service's database. They may differ from in-game information because of API delays, missing data, game updates, or differences in search frequency.",
            },
          ],
        },
        {
          title: "Search every 25 battles",
          blocks: [
            {
              type: "paragraph",
              text: "The official battle log can return only up to the latest 25 battles. To build more accurate accumulated statistics, we recommend searching the player tag once every 25 battles.",
            },
          ],
        },
        {
          title: "Trademarks and copyright",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, related names, and related images belong to their respective rights holders. This site is a tool that provides information for the convenience of fans.",
            },
          ],
        },
        {
          title: "Contact",
          blocks: [
            {
              type: "paragraph",
              text: "For bug reports, deletion requests, or other inquiries, contact {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Contact",
        description:
          "Contact information for Brawl Status KR bug reports, feature suggestions, and service inquiries.",
      },
      back: "Back to player search",
      title: "Contact",
      intro:
        "If you find an error while using the site or have a feature suggestion or data-related question, contact us by email below.",
      sections: [
        {
          title: "Operator contact",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Helpful details to include",
          blocks: [
            {
              type: "list",
              items: [
                "URL of the page where the problem occurred",
                "Player tag you searched",
                "Error message or screenshot",
                "Device and browser you used",
              ],
            },
          ],
        },
      ],
    },
  },
  ja: {
    about: {
      metadata: {
        title: "サービス紹介",
        description:
          "Brawl Status KRの戦績検索、最近のバトル分析、マップ別おすすめブロウラー、スキンカタログ機能を紹介します。",
      },
      back: "戦績検索に戻る",
      title: "Brawl Status KRについて",
      intro:
        "Brawl Status KRは、Brawl Starsプレイヤーが自分の戦績や所持ブロウラーの状況をすばやく確認できるファン制作の分析ツールです。",
      sections: [
        {
          title: "主な機能",
          blocks: [
            {
              type: "list",
              items: [
                "プレイヤータグによるプロフィールと最近のバトル履歴の検索",
                "直近25戦の勝率、勝敗、得意モード、バトル詳細の確認",
                "所持ブロウラーのガジェット、スターパワー、ハイパーチャージ、ギア、スキン情報の表示",
                "DBに保存された全バトルサンプルを基にしたマップ別おすすめブロウラー",
                "ブロウラー別スキンカタログ、価格、レア度の検索",
              ],
            },
          ],
        },
        {
          title: "データの基準",
          blocks: [
            {
              type: "paragraph",
              text: "バトル履歴は、公式APIが提供する直近最大25戦の範囲で収集されます。より正確な累積統計を得るには、25戦ごとに1回検索することをおすすめします。",
            },
          ],
        },
        {
          title: "非公式ファンサイトについて",
          blocks: [
            {
              type: "paragraph",
              text: "このサイトはSupercellとの提携、スポンサー、承認関係がない非公式のファン制作サービスです。Brawl Starsに関する名称や画像は各権利者に帰属します。",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "データ算定方法",
        description:
          "Brawl Status KRの検索サンプル、バトル重複防止、チーム戦とショーダウンの集計、推薦スコアの限界を説明します。",
      },
      title: "データ算定方法",
      eyebrow: "算定方法",
      description:
        "おすすめと累積統計がどのバトルを基に計算されるのか、また何を意味しないのかを公開します。",
      sections: [
        {
          title: "全プレイヤーの公式統計ではありません",
          blocks: [
            {
              type: "paragraph",
              text: "このサイトのDB統計は、プレイヤータグが検索された際に取得した最近のバトルを蓄積したサンプルです。検索が多い地域、実力帯、コミュニティに偏る可能性があり、保存されたユニークタグ数はユニークユーザー数とは異なります。",
            },
          ],
        },
        {
          title: "直近最大25戦を保存します",
          blocks: [
            {
              type: "paragraph",
              text: "公式バトル履歴の応答は直近最大25戦です。同じタグを再検索した場合、バトル時刻とバトルフィンガープリントに設定されたUNIQUE制約により、保存済みのバトルはスキップされます。フィンガープリントには時刻、モード、マップ、並べ替えた参加者タグを使用します。",
            },
          ],
        },
        {
          title: "チーム戦とショーダウンは別々に計算します",
          blocks: [
            {
              type: "list",
              items: [
                "通常の2チーム戦では、同じバトルフィンガープリントを1回だけ選び、両チームの参加者を展開して勝利チームと相手チームの結果を計算します。",
                "デュオ・トリオショーダウンは複数チームが存在しても、APIが各相手の個別結果を提供しないため、検索したプレイヤー視点の順位のみを使用します。",
                "フレンドバトルはおすすめと累積勝率統計から除外します。",
              ],
            },
          ],
        },
        {
          title: "5戦以上のサンプルがある場合のみおすすめに表示します",
          blocks: [
            {
              type: "paragraph",
              text: "マップとブロウラーの組み合わせが5戦以上の場合に、勝率とサンプル数をあわせて表示します。おすすめスコアはサンプルが少ないほど勝率を低めに反映する内部スコアであり、5戦あれば代表性が保証されるという意味ではありません。画面上の値は最大60秒キャッシュされる場合があります。",
            },
          ],
        },
        {
          title: "誤りを見つけましたか？",
          blocks: [
            {
              type: "paragraph",
              text: "マップやモードの翻訳、勝敗、サンプル数が実際と異なる場合は、公開リポジトリのデータ精度フォームからお知らせください。再現に必要な場合でも、プレイヤータグは一部を伏せてください。",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "GitHubでフィードバックを送る",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "プライバシーポリシー",
        description:
          "Brawl Status KRの個人情報の収集・利用、Cookie、広告、外部APIの利用について案内します。",
      },
      back: "戦績検索に戻る",
      title: "プライバシーポリシー",
      effectiveDate: "施行日: 2026年9月22日",
      intro:
        "Brawl Status KRは利用者の個人情報を不必要に収集せず、サービス提供と品質改善に必要な最小限の情報のみを処理します。",
      sections: [
        {
          title: "収集する情報",
          blocks: [
            {
              type: "list",
              items: [
                "利用者が入力したBrawl Starsのプレイヤータグ",
                "公式APIから取得した公開ゲームプロフィールと最近のバトル履歴",
                "サービスのセキュリティとエラー対応のための基本アクセスログ",
                "問い合わせメールを送信した場合のメールアドレスと問い合わせ内容",
              ],
            },
          ],
        },
        {
          title: "情報の利用目的",
          blocks: [
            {
              type: "list",
              items: [
                "プレイヤー戦績の検索と最近のバトル履歴の表示",
                "ブロウラー別累積勝率とマップ別おすすめ統計の計算",
                "エラー修正、不正なリクエストの防止、サービス安定性の改善",
                "問い合わせへの回答と機能改善の検討",
              ],
            },
          ],
        },
        {
          title: "Cookieと広告",
          blocks: [
            {
              type: "paragraph",
              text: "現在、このサービスにはログイン機能がありません。将来Google AdSenseなどの広告サービスを導入した場合、広告提供者はCookieまたは類似技術を使用して広告表示や成果測定を行うことがあります。利用者はブラウザ設定でCookieを制限または削除できます。",
            },
          ],
        },
        {
          title: "第三者サービス",
          blocks: [
            {
              type: "paragraph",
              text: "プレイヤー情報とバトル履歴の取得にBrawl Stars APIまたはAPIプロキシを使用する場合があります。サイトの運用とデプロイにはVercel、GitHubなどの外部インフラを使用する場合があります。",
            },
            {
              type: "paragraph",
              text: "所持スキンの補助取得はデフォルトで無効です。運営者が明示的に有効化した場合に限り、利用者が検索した公開プレイヤータグがBrawlaceに送信されることがあります。Jina Readerも別途有効化されている場合に限り、直接取得失敗時の補助経路として同じ公開スキンページを読み取ります。全所持スキンの補助取得に成功した場合、その結果は同じブラウザのlocalStorageに最大24時間一時保存されることがあります。補助providerが無効な場合、このキャッシュは使用されません。",
            },
            {
              type: "paragraph",
              text: "マップ、モード、ブロウラー、イベントの図鑑情報はBrawlAPIから取得し、このリクエストでは利用者が入力したプレイヤータグを送信しません。ブロウラー、マップ、バッジなど一部の画像はBrawlify CDNからリモート取得するため、ブラウザがそのCDNへ画像リクエストを送る場合があります。",
            },
          ],
        },
        {
          title: "保存期間",
          blocks: [
            {
              type: "paragraph",
              text: "現在、自動TTL削除は行っていません。バトル履歴と統計データは、サービス提供と統計品質維持のためサービス運営期間中保存され、サービス終了、運用データのリセット、または確認済みの記録依頼への対応時に削除されることがあります。問い合わせメールは、問い合わせ対応と紛争対応に必要な期間保存されます。",
            },
            {
              type: "paragraph",
              text: "公開プレイヤータグだけでは所有者を確認できないため、自動削除機能は提供していません。記録に関する依頼は、下記の連絡先から運営者が個別に確認します。",
            },
          ],
        },
        {
          title: "お問い合わせ",
          blocks: [
            {
              type: "paragraph",
              text: "プライバシーに関するお問い合わせは{email}までご連絡ください。",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "利用案内",
        description:
          "Brawl Status KRを利用する際に知っておくべきデータ基準、非公式サービスの告知、責任範囲について案内します。",
      },
      back: "戦績検索に戻る",
      title: "利用案内",
      sections: [
        {
          title: "サービスの性質",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KRはBrawl Starsプレイヤー向けの非公式ファン制作分析ツールです。Supercellとの提携、スポンサー、承認関係はなく、公式サービスではありません。",
            },
          ],
        },
        {
          title: "データの正確性",
          blocks: [
            {
              type: "paragraph",
              text: "戦績と統計は外部APIの応答と、このサービスのDBに保存されたバトル履歴を基に計算されます。APIの遅延、欠落、ゲーム更新、検索間隔の違いにより、実際のゲーム情報と異なる場合があります。",
            },
          ],
        },
        {
          title: "25戦ごとの検索を推奨",
          blocks: [
            {
              type: "paragraph",
              text: "公式バトル履歴では直近最大25戦のみ取得できます。累積統計をより正確に蓄積したい場合は、25戦ごとに1回プレイヤータグを検索することをおすすめします。",
            },
          ],
        },
        {
          title: "商標と著作権",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars、ブロスタ、関連する画像や名称は各権利者に帰属します。このサイトはファンの利便性のために情報を提供するツールです。",
            },
          ],
        },
        {
          title: "お問い合わせ",
          blocks: [
            {
              type: "paragraph",
              text: "不具合報告、削除依頼、その他のお問い合わせは{email}までご連絡ください。",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "お問い合わせ",
        description:
          "Brawl Status KRの不具合報告、機能提案、運営に関するお問い合わせ先です。",
      },
      back: "戦績検索に戻る",
      title: "お問い合わせ",
      intro:
        "サイト利用中に不具合を見つけた場合や、機能の提案、データに関するお問い合わせがある場合は、下記のメールアドレスまでご連絡ください。",
      sections: [
        {
          title: "運営者連絡先",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "お問い合わせに含めると役立つ情報",
          blocks: [
            {
              type: "list",
              items: [
                "問題が発生したページのURL",
                "検索したプレイヤータグ",
                "エラーメッセージまたはスクリーンショット",
                "使用した端末とブラウザの種類",
              ],
            },
          ],
        },
      ],
    },
  },
  "pt-br": {
    about: {
      metadata: {
        title: "Sobre o serviço",
        description:
          "Conheça a busca de histórico, a análise de batalhas recentes, as recomendações de brawlers por mapa e o catálogo de skins do Brawl Status KR.",
      },
      back: "Voltar à busca de jogador",
      title: "Sobre o Brawl Status KR",
      intro:
        "O Brawl Status KR é uma ferramenta de análise feita por fãs para ajudar jogadores de Brawl Stars a consultar rapidamente seu histórico e o estado dos brawlers que possuem.",
      sections: [
        {
          title: "Principais recursos",
          blocks: [
            {
              type: "list",
              items: [
                "Busca de perfil e batalhas recentes por tag de jogador",
                "Consulta de taxa de vitória, vitórias e derrotas, modo principal e detalhes das últimas 25 batalhas",
                "Exibição de gadgets, Poderes de Estrela, Hipercargas, equipamentos e skins dos brawlers possuídos",
                "Recomendações de brawlers por mapa com base em todas as amostras de batalhas salvas no banco de dados",
                "Busca no catálogo de skins por brawler, incluindo preço e raridade",
              ],
            },
          ],
        },
        {
          title: "Base dos dados",
          blocks: [
            {
              type: "paragraph",
              text: "O histórico de batalhas é coletado dentro do limite de até 25 batalhas recentes fornecidas pela API oficial. Para estatísticas acumuladas mais precisas, recomendamos fazer uma busca a cada 25 batalhas.",
            },
          ],
        },
        {
          title: "Aviso de site não oficial",
          blocks: [
            {
              type: "paragraph",
              text: "Este é um serviço não oficial feito por fãs, sem vínculo, patrocínio ou aprovação da Supercell. Nomes e imagens relacionados a Brawl Stars pertencem aos respectivos detentores de direitos.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Metodologia",
        description:
          "Explica as amostras baseadas em buscas, a deduplicação de batalhas, a agregação de partidas em equipe e Showdown e os limites da pontuação de recomendação do Brawl Status KR.",
      },
      title: "Metodologia",
      eyebrow: "Metodologia",
      description:
        "Explicamos quais batalhas entram nas recomendações e estatísticas acumuladas e o que esses números não representam.",
      sections: [
        {
          title: "Não são estatísticas oficiais de todos os jogadores",
          blocks: [
            {
              type: "paragraph",
              text: "As estatísticas do banco de dados deste site são uma amostra acumulada das batalhas recentes recebidas quando uma tag de jogador é pesquisada. A amostra pode ficar concentrada em regiões, faixas de habilidade ou comunidades que pesquisam mais, e o número de tags únicas salvas não equivale ao número de usuários únicos.",
            },
          ],
        },
        {
          title: "Salvamos até as 25 batalhas mais recentes",
          blocks: [
            {
              type: "paragraph",
              text: "A resposta oficial do histórico cobre até as 25 batalhas mais recentes. Ao pesquisar a mesma tag novamente, batalhas já salvas são ignoradas por restrições UNIQUE aplicadas ao horário e à impressão digital da batalha. A impressão digital usa horário, modo, mapa e as tags dos participantes em ordem.",
            },
          ],
        },
        {
          title: "Partidas em equipe e Showdown são calculados de forma diferente",
          blocks: [
            {
              type: "list",
              items: [
                "Em batalhas normais com duas equipes, cada impressão digital é selecionada uma única vez e os participantes das duas equipes são expandidos para calcular os resultados da equipe vencedora e da equipe adversária.",
                "No Showdown em Dupla ou Trio, mesmo com várias equipes, a API não fornece o resultado individual de cada adversário; por isso usamos apenas a colocação na perspectiva do jogador pesquisado.",
                "Batalhas amistosas são excluídas das recomendações e das estatísticas acumuladas de taxa de vitória.",
              ],
            },
          ],
        },
        {
          title: "A recomendação aparece apenas com pelo menos 5 partidas",
          blocks: [
            {
              type: "paragraph",
              text: "Quando uma combinação de mapa e brawler tem pelo menos 5 partidas, mostramos a taxa de vitória e o tamanho da amostra. A pontuação de recomendação é interna e reduz o peso da taxa de vitória quando a amostra é pequena; 5 partidas não garantem representatividade. Os valores exibidos podem ficar em cache por até 60 segundos.",
            },
          ],
        },
        {
          title: "Encontrou um erro?",
          blocks: [
            {
              type: "paragraph",
              text: "Se traduções de mapas ou modos, resultados ou tamanhos de amostra parecerem diferentes do jogo, avise pelo formulário de precisão de dados no repositório público. Oculte parte da tag do jogador mesmo quando ela for necessária para reproduzir o problema.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Enviar feedback no GitHub",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Política de Privacidade",
        description:
          "Informações sobre coleta e uso de dados, cookies, publicidade e APIs externas no Brawl Status KR.",
      },
      back: "Voltar à busca de jogador",
      title: "Política de Privacidade",
      effectiveDate: "Data de vigência: 22 de setembro de 2026",
      intro:
        "O Brawl Status KR não coleta informações pessoais desnecessariamente e processa apenas o mínimo necessário para prestar e melhorar o serviço.",
      sections: [
        {
          title: "Informações coletadas",
          blocks: [
            {
              type: "list",
              items: [
                "Tag de jogador do Brawl Stars informada pelo usuário",
                "Perfil público do jogo e histórico de batalhas recentes obtidos pela API oficial",
                "Logs básicos de acesso para segurança do serviço e resposta a erros",
                "Endereço de e-mail e conteúdo da mensagem quando o usuário envia um e-mail de contato",
              ],
            },
          ],
        },
        {
          title: "Finalidades do uso",
          blocks: [
            {
              type: "list",
              items: [
                "Pesquisar histórico do jogador e exibir batalhas recentes",
                "Calcular taxas de vitória acumuladas por brawler e estatísticas de recomendação por mapa",
                "Corrigir erros, bloquear solicitações maliciosas e melhorar a estabilidade do serviço",
                "Responder a contatos e avaliar melhorias de recursos",
              ],
            },
          ],
        },
        {
          title: "Cookies e publicidade",
          blocks: [
            {
              type: "paragraph",
              text: "Atualmente o serviço não oferece login. Se serviços de publicidade como o Google AdSense forem adotados no futuro, os provedores de anúncios poderão usar cookies ou tecnologias semelhantes para exibir anúncios e medir desempenho. O usuário pode limitar ou excluir cookies nas configurações do navegador.",
            },
          ],
        },
        {
          title: "Serviços de terceiros",
          blocks: [
            {
              type: "paragraph",
              text: "A Brawl Stars API ou um proxy de API pode ser usado para consultar informações do jogador e histórico de batalhas. Infraestrutura externa como Vercel e GitHub pode ser usada para operar e publicar o site.",
            },
            {
              type: "paragraph",
              text: "A consulta auxiliar de skins possuídas fica desativada por padrão. Somente quando o operador a ativa explicitamente, a tag pública pesquisada pelo usuário pode ser enviada ao Brawlace; o Jina Reader só é usado após falha da consulta direta se o fallback também tiver sido ativado separadamente. Quando a consulta completa de skins possuídas é bem-sucedida, o resultado pode ser armazenado temporariamente no localStorage do mesmo navegador por até 24 horas; esse cache não é usado quando o provedor auxiliar está desativado.",
            },
            {
              type: "paragraph",
              text: "Informações de catálogo sobre mapas, modos, brawlers e eventos são obtidas do BrawlAPI, e essas solicitações não enviam a tag de jogador informada pelo usuário. Algumas imagens, como brawlers, mapas e emblemas, são carregadas remotamente pelo CDN da Brawlify, então o navegador pode enviar solicitações de imagem a esse CDN.",
            },
          ],
        },
        {
          title: "Período de retenção",
          blocks: [
            {
              type: "paragraph",
              text: "Atualmente não há exclusão automática por TTL. O histórico de batalhas e os dados estatísticos são mantidos durante a operação do serviço para prestar o serviço e preservar a qualidade das estatísticas, podendo ser excluídos quando o serviço for encerrado, os dados operacionais forem redefinidos ou uma solicitação de registro verificada for atendida. E-mails de contato são mantidos pelo período necessário para tratar a solicitação e eventuais disputas.",
            },
            {
              type: "paragraph",
              text: "Como não é possível verificar o proprietário usando apenas uma tag pública, não oferecemos exclusão automática. Solicitações relacionadas a registros são analisadas individualmente pelo operador por meio do contato abaixo.",
            },
          ],
        },
        {
          title: "Contato",
          blocks: [
            {
              type: "paragraph",
              text: "Para assuntos de privacidade, entre em contato pelo e-mail {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Termos de Uso",
        description:
          "Critérios de dados, aviso de serviço não oficial e escopo de responsabilidade ao usar o Brawl Status KR.",
      },
      back: "Voltar à busca de jogador",
      title: "Termos de Uso",
      sections: [
        {
          title: "Natureza do serviço",
          blocks: [
            {
              type: "paragraph",
              text: "O Brawl Status KR é uma ferramenta de análise não oficial feita por fãs para jogadores de Brawl Stars. Não possui vínculo, patrocínio ou aprovação da Supercell e não é um serviço oficial.",
            },
          ],
        },
        {
          title: "Precisão dos dados",
          blocks: [
            {
              type: "paragraph",
              text: "Histórico e estatísticas são calculados a partir de respostas de APIs externas e das batalhas salvas no banco de dados deste serviço. Eles podem diferir das informações do jogo por atrasos ou falhas da API, atualizações do jogo ou diferenças na frequência de busca.",
            },
          ],
        },
        {
          title: "Recomendação de busca a cada 25 batalhas",
          blocks: [
            {
              type: "paragraph",
              text: "O histórico oficial permite consultar apenas até as 25 batalhas mais recentes. Para acumular estatísticas mais precisas, recomendamos pesquisar a tag do jogador uma vez a cada 25 batalhas.",
            },
          ],
        },
        {
          title: "Marcas e direitos autorais",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, nomes relacionados e imagens relacionadas pertencem aos respectivos detentores de direitos. Este site é uma ferramenta de informação destinada à conveniência dos fãs.",
            },
          ],
        },
        {
          title: "Contato",
          blocks: [
            {
              type: "paragraph",
              text: "Para relatar erros, solicitar exclusão ou tratar de outros assuntos, entre em contato pelo e-mail {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Contato",
        description:
          "Contato para relatar erros, sugerir recursos e tratar de questões operacionais do Brawl Status KR.",
      },
      back: "Voltar à busca de jogador",
      title: "Contato",
      intro:
        "Se encontrar um erro ao usar o site ou tiver uma sugestão de recurso ou dúvida sobre dados, entre em contato pelo e-mail abaixo.",
      sections: [
        {
          title: "Contato do operador",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Informações úteis para incluir",
          blocks: [
            {
              type: "list",
              items: [
                "URL da página onde ocorreu o problema",
                "Tag do jogador pesquisada",
                "Mensagem de erro ou captura de tela",
                "Dispositivo e navegador utilizados",
              ],
            },
          ],
        },
      ],
    },
  },
  es: {
    about: {
      metadata: {
        title: "Acerca del servicio",
        description:
          "Conoce la búsqueda de historial, el análisis de batallas recientes, las recomendaciones de brawlers por mapa y el catálogo de aspectos de Brawl Status KR.",
      },
      back: "Volver a la búsqueda de jugador",
      title: "Acerca de Brawl Status KR",
      intro:
        "Brawl Status KR es una herramienta de análisis creada por fans para que los jugadores de Brawl Stars consulten rápidamente su historial y el estado de los brawlers que poseen.",
      sections: [
        {
          title: "Funciones principales",
          blocks: [
            {
              type: "list",
              items: [
                "Buscar perfiles e historial de batallas recientes mediante la etiqueta de jugador",
                "Consultar tasa de victorias, victorias y derrotas, modo principal y detalles de las últimas 25 batallas",
                "Ver gadgets, habilidades estelares, hipercargas, engranajes y aspectos de los brawlers obtenidos",
                "Obtener recomendaciones de brawlers por mapa a partir de todas las muestras de batalla guardadas en la base de datos",
                "Buscar en el catálogo de aspectos por brawler, con precio y rareza",
              ],
            },
          ],
        },
        {
          title: "Base de los datos",
          blocks: [
            {
              type: "paragraph",
              text: "El historial de batalla se recopila dentro del límite de hasta las 25 batallas más recientes que ofrece la API oficial. Para obtener estadísticas acumuladas más precisas, recomendamos hacer una búsqueda cada 25 batallas.",
            },
          ],
        },
        {
          title: "Aviso de sitio de fans no oficial",
          blocks: [
            {
              type: "paragraph",
              text: "Este es un servicio no oficial creado por fans, sin afiliación, patrocinio ni aprobación de Supercell. Los nombres e imágenes relacionados con Brawl Stars pertenecen a sus respectivos titulares de derechos.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Metodología",
        description:
          "Explica las muestras basadas en búsquedas, la deduplicación de batallas, el cálculo de partidas por equipos y Showdown y los límites de la puntuación de recomendación de Brawl Status KR.",
      },
      title: "Metodología",
      eyebrow: "Metodología",
      description:
        "Explicamos qué batallas se usan para las recomendaciones y las estadísticas acumuladas, y qué no significan esas cifras.",
      sections: [
        {
          title: "No son estadísticas oficiales de todos los jugadores",
          blocks: [
            {
              type: "paragraph",
              text: "Las estadísticas de la base de datos son una muestra acumulada de las batallas recientes recibidas cuando se busca una etiqueta de jugador. La muestra puede sesgarse hacia regiones, niveles de habilidad o comunidades que realizan más búsquedas, y el número de etiquetas únicas guardadas no equivale al número de usuarios únicos.",
            },
          ],
        },
        {
          title: "Guardamos hasta las 25 batallas más recientes",
          blocks: [
            {
              type: "paragraph",
              text: "La respuesta oficial del historial abarca hasta las 25 batallas más recientes. Al buscar de nuevo la misma etiqueta, las batallas ya guardadas se omiten mediante restricciones UNIQUE sobre la hora y la huella de la batalla. La huella usa hora, modo, mapa y las etiquetas de los participantes ordenadas.",
            },
          ],
        },
        {
          title: "Las partidas por equipos y Showdown se calculan de forma distinta",
          blocks: [
            {
              type: "list",
              items: [
                "En las batallas normales de dos equipos, cada huella de batalla se selecciona una sola vez y después se expanden los participantes de ambos equipos para calcular los resultados del equipo ganador y del rival.",
                "En Showdown Dúo y Trío, aunque haya varios equipos, la API no ofrece el resultado individual de cada rival, por lo que solo se usa la posición desde la perspectiva del jugador buscado.",
                "Las batallas amistosas se excluyen de las recomendaciones y de las estadísticas acumuladas de tasa de victorias.",
              ],
            },
          ],
        },
        {
          title: "Las recomendaciones solo aparecen con al menos 5 partidas",
          blocks: [
            {
              type: "paragraph",
              text: "Cuando una combinación de mapa y brawler tiene al menos 5 partidas, mostramos la tasa de victorias y el tamaño de la muestra. La puntuación de recomendación es una puntuación interna que reduce más el peso de la tasa de victorias cuando la muestra es pequeña; 5 partidas no garantizan representatividad. Los valores mostrados pueden almacenarse en caché hasta 60 segundos.",
            },
          ],
        },
        {
          title: "¿Has encontrado un error?",
          blocks: [
            {
              type: "paragraph",
              text: "Si las traducciones de mapas o modos, los resultados o los tamaños de muestra no coinciden con el juego, avísanos mediante el formulario de precisión de datos del repositorio público. Oculta parte de la etiqueta del jugador incluso si es necesaria para reproducir el problema.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Enviar comentarios en GitHub",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Política de Privacidad",
        description:
          "Información sobre la recopilación y el uso de datos, cookies, publicidad y APIs externas en Brawl Status KR.",
      },
      back: "Volver a la búsqueda de jugador",
      title: "Política de Privacidad",
      effectiveDate: "Fecha de entrada en vigor: 22 de septiembre de 2026",
      intro:
        "Brawl Status KR no recopila información personal de forma innecesaria y solo procesa la información mínima necesaria para prestar y mejorar el servicio.",
      sections: [
        {
          title: "Información que recopilamos",
          blocks: [
            {
              type: "list",
              items: [
                "Etiqueta de jugador de Brawl Stars introducida por el usuario",
                "Perfil público del juego e historial de batallas recientes obtenidos mediante la API oficial",
                "Registros básicos de acceso para la seguridad del servicio y la respuesta a errores",
                "Dirección de correo y contenido del mensaje cuando el usuario envía una consulta por correo",
              ],
            },
          ],
        },
        {
          title: "Finalidad del uso de la información",
          blocks: [
            {
              type: "list",
              items: [
                "Buscar el historial del jugador y mostrar batallas recientes",
                "Calcular tasas de victoria acumuladas por brawler y estadísticas de recomendación por mapa",
                "Corregir errores, evitar solicitudes maliciosas y mejorar la estabilidad del servicio",
                "Responder consultas y estudiar mejoras de funciones",
              ],
            },
          ],
        },
        {
          title: "Cookies y publicidad",
          blocks: [
            {
              type: "paragraph",
              text: "Actualmente el servicio no ofrece inicio de sesión. Si en el futuro se incorporan servicios publicitarios como Google AdSense, los proveedores de anuncios podrán usar cookies o tecnologías similares para mostrar anuncios y medir su rendimiento. El usuario puede limitar o eliminar las cookies desde la configuración del navegador.",
            },
          ],
        },
        {
          title: "Servicios de terceros",
          blocks: [
            {
              type: "paragraph",
              text: "Se puede utilizar Brawl Stars API o un proxy de API para consultar información del jugador y el historial de batallas. Para operar y desplegar el sitio se puede usar infraestructura externa como Vercel y GitHub.",
            },
            {
              type: "paragraph",
              text: "La consulta auxiliar de aspectos poseídos está desactivada de forma predeterminada. Solo cuando el operador la activa explícitamente, la etiqueta pública buscada por el usuario puede enviarse a Brawlace; Jina Reader solo se usa tras un fallo de la consulta directa si su vía de respaldo también se activa por separado. Cuando una consulta completa de aspectos poseídos se realiza correctamente, el resultado puede guardarse temporalmente en el localStorage del mismo navegador durante un máximo de 24 horas; esta caché no se usa si el proveedor auxiliar está desactivado.",
            },
            {
              type: "paragraph",
              text: "La información de catálogo de mapas, modos, brawlers y eventos se consulta en BrawlAPI, y estas solicitudes no envían la etiqueta de jugador introducida por el usuario. Algunas imágenes, como brawlers, mapas e insignias, se cargan de forma remota desde la CDN de Brawlify, por lo que el navegador puede enviar solicitudes de imágenes a esa CDN.",
            },
          ],
        },
        {
          title: "Periodo de conservación",
          blocks: [
            {
              type: "paragraph",
              text: "Actualmente no se aplica eliminación automática por TTL. El historial de batallas y los datos estadísticos se conservan mientras el servicio está operativo para prestar el servicio y mantener la calidad de las estadísticas, y pueden eliminarse cuando el servicio finaliza, se restablecen los datos operativos o se atiende una solicitud de registros verificada. Los correos de consulta se conservan durante el tiempo necesario para atender la consulta y posibles disputas.",
            },
            {
              type: "paragraph",
              text: "Como no se puede verificar al propietario usando únicamente una etiqueta pública, no se ofrece eliminación automática. Las solicitudes relacionadas con registros son revisadas individualmente por el operador mediante el contacto indicado abajo.",
            },
          ],
        },
        {
          title: "Contacto",
          blocks: [
            {
              type: "paragraph",
              text: "Para consultas relacionadas con la privacidad, escribe a {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Condiciones de Uso",
        description:
          "Criterios de datos, aviso de servicio no oficial y alcance de responsabilidad al usar Brawl Status KR.",
      },
      back: "Volver a la búsqueda de jugador",
      title: "Condiciones de Uso",
      sections: [
        {
          title: "Naturaleza del servicio",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR es una herramienta de análisis no oficial creada por fans para jugadores de Brawl Stars. No está afiliada, patrocinada ni aprobada por Supercell y no es un servicio oficial.",
            },
          ],
        },
        {
          title: "Exactitud de los datos",
          blocks: [
            {
              type: "paragraph",
              text: "El historial y las estadísticas se calculan a partir de respuestas de APIs externas y del historial de batallas guardado en la base de datos de este servicio. Pueden diferir de la información del juego debido a retrasos u omisiones de la API, actualizaciones del juego o diferencias en la frecuencia de búsqueda.",
            },
          ],
        },
        {
          title: "Recomendación de buscar cada 25 batallas",
          blocks: [
            {
              type: "paragraph",
              text: "El historial oficial solo permite consultar hasta las 25 batallas más recientes. Para acumular estadísticas más precisas, recomendamos buscar la etiqueta del jugador una vez cada 25 batallas.",
            },
          ],
        },
        {
          title: "Marcas y derechos de autor",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, los nombres relacionados y las imágenes relacionadas pertenecen a sus respectivos titulares de derechos. Este sitio es una herramienta informativa para comodidad de los fans.",
            },
          ],
        },
        {
          title: "Contacto",
          blocks: [
            {
              type: "paragraph",
              text: "Para informar de errores, solicitar eliminaciones u otras consultas, escribe a {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Contacto",
        description:
          "Información de contacto para reportar errores, proponer funciones y realizar consultas sobre Brawl Status KR.",
      },
      back: "Volver a la búsqueda de jugador",
      title: "Contacto",
      intro:
        "Si encuentras un error al usar el sitio o tienes una propuesta de función o una consulta sobre datos, escríbenos al correo indicado abajo.",
      sections: [
        {
          title: "Contacto del operador",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Información útil para incluir",
          blocks: [
            {
              type: "list",
              items: [
                "URL de la página donde ocurrió el problema",
                "Etiqueta de jugador buscada",
                "Mensaje de error o captura de pantalla",
                "Dispositivo y navegador utilizados",
              ],
            },
          ],
        },
      ],
    },
  },
  tr: {
    about: {
      metadata: {
        title: "Hizmet Hakkında",
        description:
          "Brawl Status KR'nin oyuncu arama, son savaş analizi, haritaya göre brawler önerileri ve kostüm kataloğu özelliklerini tanıyın.",
      },
      back: "Oyuncu aramasına dön",
      title: "Brawl Status KR Hakkında",
      intro:
        "Brawl Status KR, Brawl Stars oyuncularının savaş geçmişlerini ve sahip oldukları brawler durumunu hızlıca kontrol etmesine yardımcı olan hayran yapımı bir analiz aracıdır.",
      sections: [
        {
          title: "Başlıca özellikler",
          blocks: [
            {
              type: "list",
              items: [
                "Oyuncu etiketine göre profil ve son savaş geçmişi arama",
                "Son 25 savaşın kazanma oranını, galibiyet ve mağlubiyetlerini, öne çıkan modu ve savaş ayrıntılarını görüntüleme",
                "Sahip olunan brawler'ların gadget, Yıldız Gücü, Hiperşarj, ekipman ve kostüm bilgilerini görüntüleme",
                "Veritabanında saklanan tüm savaş örneklerine göre harita bazlı brawler önerileri",
                "Brawler'a göre kostüm kataloğu, fiyat ve nadirlik arama",
              ],
            },
          ],
        },
        {
          title: "Veri temeli",
          blocks: [
            {
              type: "paragraph",
              text: "Savaş geçmişi, resmi API'nin sağladığı en fazla son 25 savaş kapsamında toplanır. Daha doğru birikimli istatistikler için her 25 savaşta bir arama yapmanızı öneririz.",
            },
          ],
        },
        {
          title: "Resmî olmayan hayran sitesi bildirimi",
          blocks: [
            {
              type: "paragraph",
              text: "Bu site Supercell ile bağlantısı, sponsorluğu veya onayı bulunmayan resmî olmayan, hayran yapımı bir hizmettir. Brawl Stars ile ilgili adlar ve görseller ilgili hak sahiplerine aittir.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Hesaplama Yöntemi",
        description:
          "Brawl Status KR'nin arama temelli örneklemini, savaş tekilleştirmesini, takım savaşları ve Showdown hesaplamasını ve öneri puanının sınırlarını açıklar.",
      },
      title: "Hesaplama Yöntemi",
      eyebrow: "Metodoloji",
      description:
        "Öneriler ve birikimli istatistiklerin hangi savaşlara göre hesaplandığını ve bu sayıların ne anlama gelmediğini açıklarız.",
      sections: [
        {
          title: "Tüm oyuncuların resmî istatistikleri değildir",
          blocks: [
            {
              type: "paragraph",
              text: "Sitenin veritabanı istatistikleri, oyuncu etiketleri arandığında alınan son savaşların birikmiş örneklemidir. Örneklem, daha çok arama yapılan bölgelere, beceri seviyelerine veya topluluklara kayabilir; saklanan benzersiz etiket sayısı benzersiz kullanıcı sayısıyla aynı değildir.",
            },
          ],
        },
        {
          title: "En fazla son 25 savaşı saklarız",
          blocks: [
            {
              type: "paragraph",
              text: "Resmî savaş geçmişi yanıtı en fazla son 25 savaşı kapsar. Aynı etiket tekrar arandığında, savaş zamanı ve savaş parmak izi üzerindeki UNIQUE kısıtları sayesinde önceden saklanan savaşlar atlanır. Parmak izi; zaman, mod, harita ve sıralanmış katılımcı etiketlerini kullanır.",
            },
          ],
        },
        {
          title: "Takım savaşları ve Showdown farklı hesaplanır",
          blocks: [
            {
              type: "list",
              items: [
                "Normal iki takımlı savaşlarda aynı savaş parmak izi bir kez seçilir, ardından iki takımın katılımcıları açılarak kazanan takım ve rakip takım sonuçları hesaplanır.",
                "Duo ve Trio Showdown'da birden fazla takım olsa bile API her rakibin ayrı sonucunu sağlamaz; bu nedenle yalnızca aranan oyuncunun bakış açısından sıralama kullanılır.",
                "Dostluk savaşları önerilerden ve birikimli kazanma oranı istatistiklerinden çıkarılır.",
              ],
            },
          ],
        },
        {
          title: "Öneriler yalnızca en az 5 maç örneğinde gösterilir",
          blocks: [
            {
              type: "paragraph",
              text: "Bir harita-brawler kombinasyonunda en az 5 savaş olduğunda kazanma oranı ve örneklem sayısı birlikte gösterilir. Öneri puanı, örneklem küçüldükçe kazanma oranının etkisini azaltan dahili bir puandır; 5 savaş temsiliyet garantisi değildir. Ekrandaki değerler en fazla 60 saniye önbellekte tutulabilir.",
            },
          ],
        },
        {
          title: "Bir hata mı buldunuz?",
          blocks: [
            {
              type: "paragraph",
              text: "Harita veya mod çevirileri, sonuçlar ya da örneklem sayıları oyundan farklı görünüyorsa herkese açık depodaki veri doğruluğu formuyla bildirin. Sorunu yeniden üretmek için gerekse bile oyuncu etiketinin bir kısmını gizleyin.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "GitHub'da geri bildirim bırak",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Gizlilik Politikası",
        description:
          "Brawl Status KR'de veri toplama ve kullanma, çerezler, reklamlar ve harici API kullanımı hakkında bilgi.",
      },
      back: "Oyuncu aramasına dön",
      title: "Gizlilik Politikası",
      effectiveDate: "Yürürlük tarihi: 22 Eylül 2026",
      intro:
        "Brawl Status KR gereksiz kişisel bilgi toplamaz ve yalnızca hizmeti sunmak ve iyileştirmek için gereken asgari bilgileri işler.",
      sections: [
        {
          title: "Topladığımız bilgiler",
          blocks: [
            {
              type: "list",
              items: [
                "Kullanıcının girdiği Brawl Stars oyuncu etiketi",
                "Resmî API üzerinden alınan herkese açık oyun profili ve son savaş geçmişi",
                "Hizmet güvenliği ve hata müdahalesi için temel erişim günlükleri",
                "Kullanıcı e-posta ile iletişim kurduğunda e-posta adresi ve mesaj içeriği",
              ],
            },
          ],
        },
        {
          title: "Bilgileri kullanma amaçlarımız",
          blocks: [
            {
              type: "list",
              items: [
                "Oyuncu geçmişini aramak ve son savaşları göstermek",
                "Brawler bazında birikimli kazanma oranlarını ve harita bazında öneri istatistiklerini hesaplamak",
                "Hataları düzeltmek, kötü niyetli istekleri engellemek ve hizmet kararlılığını artırmak",
                "Soruları yanıtlamak ve özellik iyileştirmelerini değerlendirmek",
              ],
            },
          ],
        },
        {
          title: "Çerezler ve reklamlar",
          blocks: [
            {
              type: "paragraph",
              text: "Hizmet şu anda giriş özelliği sunmaz. Gelecekte Google AdSense gibi reklam hizmetleri eklenirse reklam sağlayıcıları reklam gösterimi ve performans ölçümü için çerezler veya benzer teknolojiler kullanabilir. Kullanıcılar tarayıcı ayarlarından çerezleri kısıtlayabilir veya silebilir.",
            },
          ],
        },
        {
          title: "Üçüncü taraf hizmetleri",
          blocks: [
            {
              type: "paragraph",
              text: "Oyuncu bilgilerini ve savaş geçmişini almak için Brawl Stars API veya bir API proxy'si kullanılabilir. Sitenin işletilmesi ve dağıtımı için Vercel ve GitHub gibi harici altyapılar kullanılabilir.",
            },
            {
              type: "paragraph",
              text: "Sahip olunan kostümler için yardımcı sorgu varsayılan olarak devre dışıdır. Yalnızca operatör açıkça etkinleştirdiğinde kullanıcının aradığı herkese açık oyuncu etiketi Brawlace'e gönderilebilir; Jina Reader da ancak yedek yol ayrıca etkinleştirilmişse doğrudan sorgu başarısız olduktan sonra kullanılır. Tam kostüm sorgusu başarıyla tamamlanırsa sonuç aynı tarayıcının localStorage alanında en fazla 24 saat geçici olarak saklanabilir; yardımcı sağlayıcı devre dışıysa bu önbellek kullanılmaz.",
            },
            {
              type: "paragraph",
              text: "Harita, mod, brawler ve etkinlik kataloğu bilgileri BrawlAPI'den alınır ve bu isteklerde kullanıcının girdiği oyuncu etiketi gönderilmez. Brawler, harita ve rozet gibi bazı görseller Brawlify CDN'den uzaktan yüklendiği için tarayıcı bu CDN'e görsel istekleri gönderebilir.",
            },
          ],
        },
        {
          title: "Saklama süresi",
          blocks: [
            {
              type: "paragraph",
              text: "Şu anda otomatik TTL silme uygulanmaz. Savaş geçmişi ve istatistik verileri, hizmeti sunmak ve istatistik kalitesini korumak için hizmet çalıştığı sürece saklanır; hizmet sona erdiğinde, işletim verileri sıfırlandığında veya doğrulanmış bir kayıt talebi işlendiğinde silinebilir. İletişim e-postaları, talebi işlemek ve olası uyuşmazlıklara yanıt vermek için gereken süre boyunca saklanır.",
            },
            {
              type: "paragraph",
              text: "Yalnızca herkese açık bir oyuncu etiketiyle sahibini doğrulamak mümkün olmadığından otomatik silme özelliği sunulmaz. Kayıtlarla ilgili talepler aşağıdaki iletişim kanalı üzerinden operatör tarafından ayrı ayrı incelenir.",
            },
          ],
        },
        {
          title: "İletişim",
          blocks: [
            {
              type: "paragraph",
              text: "Gizlilikle ilgili sorular için {email} adresinden iletişime geçin.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Kullanım Koşulları",
        description:
          "Brawl Status KR kullanımı için veri ölçütleri, resmî olmayan hizmet bildirimi ve sorumluluk kapsamı.",
      },
      back: "Oyuncu aramasına dön",
      title: "Kullanım Koşulları",
      sections: [
        {
          title: "Hizmetin niteliği",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR, Brawl Stars oyuncuları için resmî olmayan, hayran yapımı bir analiz aracıdır. Supercell ile bağlantısı, sponsorluğu veya onayı yoktur ve resmî bir hizmet değildir.",
            },
          ],
        },
        {
          title: "Veri doğruluğu",
          blocks: [
            {
              type: "paragraph",
              text: "Oyuncu geçmişi ve istatistikler harici API yanıtları ile bu hizmetin veritabanında saklanan savaş geçmişine göre hesaplanır. API gecikmeleri, eksik veriler, oyun güncellemeleri veya arama sıklığı farkları nedeniyle oyun içi bilgilerden farklı olabilir.",
            },
          ],
        },
        {
          title: "Her 25 savaşta bir arama önerisi",
          blocks: [
            {
              type: "paragraph",
              text: "Resmî savaş geçmişi yalnızca en fazla son 25 savaşı getirir. Daha doğru birikimli istatistikler oluşturmak için her 25 savaşta bir oyuncu etiketini aramanızı öneririz.",
            },
          ],
        },
        {
          title: "Ticari markalar ve telif hakkı",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, ilgili adlar ve görseller ilgili hak sahiplerine aittir. Bu site, hayranların yararlanması için bilgi sağlayan bir araçtır.",
            },
          ],
        },
        {
          title: "İletişim",
          blocks: [
            {
              type: "paragraph",
              text: "Hata bildirimleri, silme talepleri veya diğer sorular için {email} adresinden iletişime geçin.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "İletişim",
        description:
          "Brawl Status KR hata bildirimleri, özellik önerileri ve işletimle ilgili sorular için iletişim bilgileri.",
      },
      back: "Oyuncu aramasına dön",
      title: "İletişim",
      intro:
        "Siteyi kullanırken bir hata bulursanız veya özellik öneriniz ya da verilerle ilgili bir sorunuz varsa aşağıdaki e-posta adresinden iletişime geçin.",
      sections: [
        {
          title: "Operatör iletişim bilgisi",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Mesajınıza eklemeniz yararlı olur",
          blocks: [
            {
              type: "list",
              items: [
                "Sorunun oluştuğu sayfanın adresi",
                "Aradığınız oyuncu etiketi",
                "Hata mesajı veya ekran görüntüsü",
                "Kullandığınız cihaz ve tarayıcı türü",
              ],
            },
          ],
        },
      ],
    },
  },
  de: {
    about: {
      metadata: {
        title: "Über den Dienst",
        description:
          "Informationen zur Spielersuche, Analyse der letzten Kämpfe, kartenbezogenen Brawler-Empfehlungen und zum Skin-Katalog von Brawl Status KR.",
      },
      back: "Zurück zur Spielersuche",
      title: "Über Brawl Status KR",
      intro:
        "Brawl Status KR ist ein von Fans erstelltes Analysewerkzeug, mit dem Brawl-Stars-Spieler schnell ihren Kampfverlauf und den Status ihrer Brawler prüfen können.",
      sections: [
        {
          title: "Hauptfunktionen",
          blocks: [
            {
              type: "list",
              items: [
                "Profile und letzte Kämpfe anhand des Spieler-Tags suchen",
                "Siegquote, Siege und Niederlagen, stärksten Modus und Kampfdetails der letzten 25 Kämpfe ansehen",
                "Gadgets, Starpowers, Hypercharges, Gears und Skin-Informationen der eigenen Brawler anzeigen",
                "Kartenbezogene Brawler-Empfehlungen auf Basis aller in der Datenbank gespeicherten Kampfproben",
                "Skin-Katalog nach Brawler einschließlich Preisen und Seltenheiten durchsuchen",
              ],
            },
          ],
        },
        {
          title: "Datengrundlage",
          blocks: [
            {
              type: "paragraph",
              text: "Der Kampfverlauf wird aus den bis zu 25 neuesten Kämpfen erfasst, die die offizielle API bereitstellt. Für genauere kumulierte Statistiken empfehlen wir eine Suche nach jeweils 25 Kämpfen.",
            },
          ],
        },
        {
          title: "Hinweis zur inoffiziellen Fan-Seite",
          blocks: [
            {
              type: "paragraph",
              text: "Dies ist ein inoffizieller, von Fans erstellter Dienst ohne Verbindung zu, Sponsoring durch oder Genehmigung von Supercell. Namen und Bilder rund um Brawl Stars gehören den jeweiligen Rechteinhabern.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Berechnungsmethode",
        description:
          "Erläutert Suchstichproben, Kampf-Deduplizierung, Auswertung von Teamkämpfen und Showdown sowie die Grenzen der Empfehlungswerte von Brawl Status KR.",
      },
      title: "Berechnungsmethode",
      eyebrow: "Methodik",
      description:
        "Wir legen offen, welche Kämpfe in Empfehlungen und kumulierte Statistiken einfließen und was diese Werte nicht aussagen.",
      sections: [
        {
          title: "Keine offizielle Statistik aller Spieler",
          blocks: [
            {
              type: "paragraph",
              text: "Die Datenbankstatistiken dieser Seite bestehen aus angesammelten Stichproben der letzten Kämpfe, die bei der Suche nach Spieler-Tags abgerufen werden. Die Stichprobe kann sich auf Regionen, Spielstärken oder Communities mit vielen Suchanfragen konzentrieren; die Zahl der gespeicherten eindeutigen Tags entspricht nicht der Zahl eindeutiger Nutzer.",
            },
          ],
        },
        {
          title: "Wir speichern bis zu 25 aktuelle Kämpfe",
          blocks: [
            {
              type: "paragraph",
              text: "Die offizielle Kampfverlaufsantwort umfasst bis zu die 25 neuesten Kämpfe. Wird derselbe Tag erneut gesucht, werden bereits gespeicherte Kämpfe durch UNIQUE-Beschränkungen auf Kampfzeit und Kampf-Fingerabdruck übersprungen. Der Fingerabdruck verwendet Zeit, Modus, Karte und sortierte Teilnehmer-Tags.",
            },
          ],
        },
        {
          title: "Teamkämpfe und Showdown werden unterschiedlich berechnet",
          blocks: [
            {
              type: "list",
              items: [
                "Bei normalen Kämpfen mit zwei Teams wird jeder Kampf-Fingerabdruck einmal ausgewählt. Danach werden die Teilnehmer beider Teams ausgewertet, um die Ergebnisse des Siegerteams und des gegnerischen Teams zu berechnen.",
                "Bei Duo- und Trio-Showdown liefert die API trotz mehrerer Teams keine einzelnen Ergebnisse aller Gegner. Daher wird nur die Platzierung aus Sicht des gesuchten Spielers verwendet.",
                "Freundschaftskämpfe werden aus Empfehlungen und kumulierten Siegquotenstatistiken ausgeschlossen.",
              ],
            },
          ],
        },
        {
          title: "Empfehlungen erscheinen erst ab 5 Kämpfen",
          blocks: [
            {
              type: "paragraph",
              text: "Hat eine Karten-Brawler-Kombination mindestens 5 Kämpfe, zeigen wir Siegquote und Stichprobengröße gemeinsam an. Der Empfehlungswert ist ein interner Wert, der die Siegquote bei kleinen Stichproben stärker abwertet; 5 Kämpfe garantieren keine Repräsentativität. Angezeigte Werte können bis zu 60 Sekunden zwischengespeichert werden.",
            },
          ],
        },
        {
          title: "Fehler gefunden?",
          blocks: [
            {
              type: "paragraph",
              text: "Wenn Karten- oder Modusübersetzungen, Ergebnisse oder Stichprobengrößen vom tatsächlichen Spiel abweichen, melden Sie dies über das Formular zur Datengenauigkeit im öffentlichen Repository. Spieler-Tags sollten auch dann teilweise unkenntlich gemacht werden, wenn sie zur Reproduktion nötig sind.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Feedback auf GitHub hinterlassen",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Datenschutzerklärung",
        description:
          "Informationen zur Erhebung und Nutzung von Daten, zu Cookies, Werbung und externen APIs bei Brawl Status KR.",
      },
      back: "Zurück zur Spielersuche",
      title: "Datenschutzerklärung",
      effectiveDate: "Gültig ab: 22. September 2026",
      intro:
        "Brawl Status KR erhebt personenbezogene Daten nicht unnötig und verarbeitet nur die Mindestinformationen, die für die Bereitstellung und Verbesserung des Dienstes erforderlich sind.",
      sections: [
        {
          title: "Erhobene Informationen",
          blocks: [
            {
              type: "list",
              items: [
                "Vom Nutzer eingegebener Brawl-Stars-Spieler-Tag",
                "Über die offizielle API abgerufene öffentliche Spielprofile und letzte Kampfverläufe",
                "Grundlegende Zugriffsprotokolle für Dienstsicherheit und Fehlerbehandlung",
                "E-Mail-Adresse und Inhalt der Anfrage, wenn eine Kontakt-E-Mail gesendet wird",
              ],
            },
          ],
        },
        {
          title: "Zwecke der Datennutzung",
          blocks: [
            {
              type: "list",
              items: [
                "Spielerverlauf suchen und letzte Kämpfe anzeigen",
                "Kumulierte Siegquoten je Brawler und kartenbezogene Empfehlungsstatistiken berechnen",
                "Fehler beheben, missbräuchliche Anfragen verhindern und die Dienststabilität verbessern",
                "Anfragen beantworten und Funktionsverbesserungen prüfen",
              ],
            },
          ],
        },
        {
          title: "Cookies und Werbung",
          blocks: [
            {
              type: "paragraph",
              text: "Der Dienst bietet derzeit keine Anmeldung. Falls künftig Werbedienste wie Google AdSense eingesetzt werden, können Werbeanbieter Cookies oder ähnliche Technologien verwenden, um Werbung auszuliefern und deren Leistung zu messen. Nutzer können Cookies in den Browser-Einstellungen einschränken oder löschen.",
            },
          ],
        },
        {
          title: "Dienste von Drittanbietern",
          blocks: [
            {
              type: "paragraph",
              text: "Zum Abrufen von Spielerinformationen und Kampfverläufen können die Brawl Stars API oder ein API-Proxy verwendet werden. Für Betrieb und Bereitstellung der Website kann externe Infrastruktur wie Vercel und GitHub eingesetzt werden.",
            },
            {
              type: "paragraph",
              text: "Die zusätzliche Abfrage eigener Skins ist standardmäßig deaktiviert. Nur wenn der Betreiber sie ausdrücklich aktiviert, kann der vom Nutzer gesuchte öffentliche Spieler-Tag an Brawlace übermittelt werden; Jina Reader wird nach einem fehlgeschlagenen Direktabruf nur verwendet, wenn auch dieser Fallback separat aktiviert wurde. Nach einer erfolgreichen vollständigen Abfrage kann das Ergebnis bis zu 24 Stunden im localStorage desselben Browsers zwischengespeichert werden; bei deaktiviertem Zusatzanbieter wird dieser Cache nicht verwendet.",
            },
            {
              type: "paragraph",
              text: "Kataloginformationen zu Karten, Modi, Brawlern und Events werden von BrawlAPI abgerufen; dabei wird der vom Nutzer eingegebene Spieler-Tag nicht gesendet. Einige Bilder, etwa von Brawlern, Karten und Abzeichen, werden remote vom Brawlify-CDN geladen, sodass der Browser Bildanfragen an dieses CDN senden kann.",
            },
          ],
        },
        {
          title: "Speicherdauer",
          blocks: [
            {
              type: "paragraph",
              text: "Derzeit erfolgt keine automatische TTL-Löschung. Kampfverläufe und statistische Daten werden während des Betriebs des Dienstes zur Bereitstellung und zur Sicherung der Statistikqualität gespeichert und können bei Einstellung des Dienstes, Zurücksetzen der Betriebsdaten oder Bearbeitung einer verifizierten Datenanfrage gelöscht werden. Kontakt-E-Mails werden so lange aufbewahrt, wie es für die Bearbeitung der Anfrage und mögliche Streitfälle erforderlich ist.",
            },
            {
              type: "paragraph",
              text: "Da sich der Eigentümer allein anhand eines öffentlichen Spieler-Tags nicht verifizieren lässt, gibt es keine automatische Löschfunktion. Anfragen zu gespeicherten Daten werden vom Betreiber über die unten angegebene Kontaktmöglichkeit einzeln geprüft.",
            },
          ],
        },
        {
          title: "Kontakt",
          blocks: [
            {
              type: "paragraph",
              text: "Bei Fragen zum Datenschutz kontaktieren Sie uns unter {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Nutzungshinweise",
        description:
          "Datengrundlagen, Hinweis zum inoffiziellen Dienst und Verantwortungsumfang bei der Nutzung von Brawl Status KR.",
      },
      back: "Zurück zur Spielersuche",
      title: "Nutzungshinweise",
      sections: [
        {
          title: "Art des Dienstes",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR ist ein inoffizielles, von Fans erstelltes Analysewerkzeug für Brawl-Stars-Spieler. Es besteht keine Verbindung zu, kein Sponsoring durch und keine Genehmigung von Supercell; der Dienst ist nicht offiziell.",
            },
          ],
        },
        {
          title: "Datengenauigkeit",
          blocks: [
            {
              type: "paragraph",
              text: "Spielerverlauf und Statistiken werden aus Antworten externer APIs und den in der Datenbank dieses Dienstes gespeicherten Kampfverläufen berechnet. Durch API-Verzögerungen, fehlende Daten, Spielupdates oder unterschiedliche Suchintervalle können sie von den tatsächlichen Spieldaten abweichen.",
            },
          ],
        },
        {
          title: "Suche nach jeweils 25 Kämpfen empfohlen",
          blocks: [
            {
              type: "paragraph",
              text: "Der offizielle Kampfverlauf kann nur die bis zu 25 neuesten Kämpfe abrufen. Für genauere kumulierte Statistiken empfehlen wir, den Spieler-Tag nach jeweils 25 Kämpfen einmal zu suchen.",
            },
          ],
        },
        {
          title: "Marken und Urheberrecht",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars sowie zugehörige Namen und Bilder gehören den jeweiligen Rechteinhabern. Diese Website ist ein Informationswerkzeug für die Nutzung durch Fans.",
            },
          ],
        },
        {
          title: "Kontakt",
          blocks: [
            {
              type: "paragraph",
              text: "Für Fehlermeldungen, Löschanfragen oder sonstige Anliegen kontaktieren Sie uns unter {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Kontakt",
        description:
          "Kontaktinformationen für Fehlermeldungen, Funktionsvorschläge und betriebliche Fragen zu Brawl Status KR.",
      },
      back: "Zurück zur Spielersuche",
      title: "Kontakt",
      intro:
        "Wenn Sie bei der Nutzung der Website einen Fehler finden oder einen Funktionsvorschlag beziehungsweise eine Frage zu den Daten haben, kontaktieren Sie uns über die unten angegebene E-Mail-Adresse.",
      sections: [
        {
          title: "Kontakt zum Betreiber",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Hilfreiche Angaben für Ihre Anfrage",
          blocks: [
            {
              type: "list",
              items: [
                "Adresse der Seite, auf der das Problem auftrat",
                "Gesuchter Spieler-Tag",
                "Fehlermeldung oder Screenshot",
                "Verwendetes Gerät und verwendeter Browser",
              ],
            },
          ],
        },
      ],
    },
  },
  fr: {
    about: {
      metadata: {
        title: "À propos du service",
        description:
          "Découvrez la recherche de profil, l'analyse des combats récents, les recommandations de brawlers par carte et le catalogue de skins de Brawl Status KR.",
      },
      back: "Retour à la recherche de joueur",
      title: "À propos de Brawl Status KR",
      intro:
        "Brawl Status KR est un outil d'analyse créé par des fans qui permet aux joueurs de Brawl Stars de consulter rapidement leur historique et l'état des brawlers qu'ils possèdent.",
      sections: [
        {
          title: "Fonctionnalités principales",
          blocks: [
            {
              type: "list",
              items: [
                "Recherche du profil et des combats récents à partir du tag joueur",
                "Consultation du taux de victoire, des victoires et défaites, du mode principal et du détail des 25 derniers combats",
                "Affichage des gadgets, pouvoirs star, hypercharges, équipements et skins des brawlers possédés",
                "Recommandations de brawlers par carte basées sur tous les échantillons de combats enregistrés en base",
                "Recherche dans le catalogue de skins par brawler, avec prix et rareté",
              ],
            },
          ],
        },
        {
          title: "Base des données",
          blocks: [
            {
              type: "paragraph",
              text: "L'historique des combats est collecté dans la limite des 25 combats les plus récents fournis par l'API officielle. Pour obtenir des statistiques cumulées plus précises, nous recommandons d'effectuer une recherche tous les 25 combats.",
            },
          ],
        },
        {
          title: "Avis de site de fans non officiel",
          blocks: [
            {
              type: "paragraph",
              text: "Ce service non officiel est créé par des fans et n'est ni affilié, ni sponsorisé, ni approuvé par Supercell. Les noms et images liés à Brawl Stars appartiennent à leurs détenteurs de droits respectifs.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Méthodologie",
        description:
          "Explique l'échantillonnage lié aux recherches, la déduplication des combats, l'agrégation des combats en équipe et du Showdown ainsi que les limites du score de recommandation de Brawl Status KR.",
      },
      title: "Méthodologie",
      eyebrow: "Méthodologie",
      description:
        "Nous expliquons quels combats servent aux recommandations et aux statistiques cumulées, ainsi que ce que ces chiffres ne signifient pas.",
      sections: [
        {
          title: "Il ne s'agit pas de statistiques officielles de tous les joueurs",
          blocks: [
            {
              type: "paragraph",
              text: "Les statistiques de la base de données du site sont un échantillon cumulé des combats récents récupérés lorsqu'un tag joueur est recherché. L'échantillon peut être biaisé vers les régions, niveaux de jeu ou communautés qui effectuent le plus de recherches, et le nombre de tags uniques enregistrés n'est pas égal au nombre d'utilisateurs uniques.",
            },
          ],
        },
        {
          title: "Nous enregistrons jusqu'aux 25 combats les plus récents",
          blocks: [
            {
              type: "paragraph",
              text: "La réponse officielle de l'historique couvre jusqu'aux 25 combats les plus récents. Quand le même tag est recherché de nouveau, les combats déjà enregistrés sont ignorés grâce à des contraintes UNIQUE sur l'heure et l'empreinte du combat. L'empreinte utilise l'heure, le mode, la carte et les tags triés des participants.",
            },
          ],
        },
        {
          title: "Les combats en équipe et le Showdown sont calculés différemment",
          blocks: [
            {
              type: "list",
              items: [
                "Pour un combat normal à deux équipes, chaque empreinte est sélectionnée une seule fois, puis les participants des deux équipes sont développés afin de calculer les résultats de l'équipe gagnante et de l'équipe adverse.",
                "En Showdown Duo et Trio, même avec plusieurs équipes, l'API ne fournit pas le résultat individuel de chaque adversaire. Seul le classement du point de vue du joueur recherché est donc utilisé.",
                "Les combats amicaux sont exclus des recommandations et des statistiques cumulées de taux de victoire.",
              ],
            },
          ],
        },
        {
          title: "Les recommandations n'apparaissent qu'à partir de 5 combats",
          blocks: [
            {
              type: "paragraph",
              text: "Lorsqu'une combinaison carte-brawler compte au moins 5 combats, nous affichons le taux de victoire et la taille de l'échantillon. Le score de recommandation est un score interne qui réduit davantage le poids du taux de victoire quand l'échantillon est faible ; 5 combats ne garantissent pas la représentativité. Les valeurs affichées peuvent être mises en cache jusqu'à 60 secondes.",
            },
          ],
        },
        {
          title: "Vous avez trouvé une erreur ?",
          blocks: [
            {
              type: "paragraph",
              text: "Si les traductions de cartes ou de modes, les résultats ou les tailles d'échantillon semblent différents du jeu, signalez-le via le formulaire de précision des données du dépôt public. Masquez une partie du tag joueur même s'il est nécessaire pour reproduire le problème.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Laisser un avis sur GitHub",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Politique de confidentialité",
        description:
          "Informations sur la collecte et l'utilisation des données, les cookies, la publicité et les API externes de Brawl Status KR.",
      },
      back: "Retour à la recherche de joueur",
      title: "Politique de confidentialité",
      effectiveDate: "Date d'entrée en vigueur : 22 septembre 2026",
      intro:
        "Brawl Status KR ne collecte pas inutilement de données personnelles et ne traite que les informations minimales nécessaires au fonctionnement et à l'amélioration du service.",
      sections: [
        {
          title: "Informations collectées",
          blocks: [
            {
              type: "list",
              items: [
                "Tag Brawl Stars saisi par l'utilisateur",
                "Profil de jeu public et historique récent des combats obtenus via l'API officielle",
                "Journaux d'accès de base pour la sécurité du service et le traitement des erreurs",
                "Adresse e-mail et contenu du message lorsqu'un utilisateur envoie un e-mail de contact",
              ],
            },
          ],
        },
        {
          title: "Utilisation des informations",
          blocks: [
            {
              type: "list",
              items: [
                "Rechercher l'historique d'un joueur et afficher ses combats récents",
                "Calculer les taux de victoire cumulés par brawler et les statistiques de recommandation par carte",
                "Corriger les erreurs, empêcher les requêtes malveillantes et améliorer la stabilité du service",
                "Répondre aux demandes et examiner les améliorations de fonctionnalités",
              ],
            },
          ],
        },
        {
          title: "Cookies et publicité",
          blocks: [
            {
              type: "paragraph",
              text: "Le service ne propose actuellement aucune connexion par compte. Si des services publicitaires tels que Google AdSense sont ajoutés à l'avenir, les fournisseurs de publicité pourront utiliser des cookies ou des technologies similaires pour diffuser des annonces et mesurer leurs performances. Les utilisateurs peuvent limiter ou supprimer les cookies dans les paramètres du navigateur.",
            },
          ],
        },
        {
          title: "Services tiers",
          blocks: [
            {
              type: "paragraph",
              text: "L'API Brawl Stars ou un proxy d'API peut être utilisé pour récupérer les informations du joueur et l'historique des combats. Des infrastructures externes telles que Vercel et GitHub peuvent être utilisées pour exploiter et déployer le site.",
            },
            {
              type: "paragraph",
              text: "La consultation auxiliaire des skins possédés est désactivée par défaut. Ce n'est que si l'opérateur l'active explicitement que le tag joueur public recherché peut être transmis à Brawlace ; Jina Reader n'est utilisé après l'échec de la consultation directe que si ce secours a lui aussi été activé séparément. Lorsqu'une consultation complète réussit, le résultat peut être mis en cache dans le localStorage du même navigateur pendant 24 heures au maximum ; ce cache n'est pas utilisé si le fournisseur auxiliaire est désactivé.",
            },
            {
              type: "paragraph",
              text: "Les informations de catalogue sur les cartes, modes, brawlers et événements sont récupérées auprès de BrawlAPI, et ces requêtes n'envoient pas le tag saisi par l'utilisateur. Certaines images, notamment celles des brawlers, cartes et badges, sont chargées à distance depuis le CDN de Brawlify ; le navigateur peut donc envoyer des requêtes d'image à ce CDN.",
            },
          ],
        },
        {
          title: "Durée de conservation",
          blocks: [
            {
              type: "paragraph",
              text: "Aucune suppression automatique par TTL n'est actuellement appliquée. L'historique des combats et les données statistiques sont conservés pendant l'exploitation du service afin de fournir celui-ci et de maintenir la qualité des statistiques, et peuvent être supprimés lors de l'arrêt du service, d'une réinitialisation des données d'exploitation ou du traitement d'une demande de données vérifiée. Les e-mails de contact sont conservés pendant la durée nécessaire au traitement de la demande et à la gestion d'éventuels litiges.",
            },
            {
              type: "paragraph",
              text: "Comme il n'est pas possible de vérifier le propriétaire à partir d'un tag public uniquement, aucune suppression automatique n'est proposée. Les demandes relatives aux données sont examinées individuellement par l'opérateur via le contact ci-dessous.",
            },
          ],
        },
        {
          title: "Contact",
          blocks: [
            {
              type: "paragraph",
              text: "Pour toute question liée à la confidentialité, contactez-nous à {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Conditions d'utilisation",
        description:
          "Référentiel des données, avis de service non officiel et étendue de responsabilité lors de l'utilisation de Brawl Status KR.",
      },
      back: "Retour à la recherche de joueur",
      title: "Conditions d'utilisation",
      sections: [
        {
          title: "Nature du service",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR est un outil d'analyse non officiel créé par des fans pour les joueurs de Brawl Stars. Il n'est ni affilié, ni sponsorisé, ni approuvé par Supercell et ne constitue pas un service officiel.",
            },
          ],
        },
        {
          title: "Exactitude des données",
          blocks: [
            {
              type: "paragraph",
              text: "L'historique et les statistiques sont calculés à partir des réponses d'API externes et des combats enregistrés dans la base de données du service. Ils peuvent différer des informations du jeu en raison de retards ou d'omissions de l'API, de mises à jour du jeu ou de différences de fréquence de recherche.",
            },
          ],
        },
        {
          title: "Recherche recommandée tous les 25 combats",
          blocks: [
            {
              type: "paragraph",
              text: "L'historique officiel ne permet de récupérer que les 25 combats les plus récents. Pour constituer des statistiques cumulées plus précises, nous recommandons de rechercher le tag joueur une fois tous les 25 combats.",
            },
          ],
        },
        {
          title: "Marques et droits d'auteur",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, les noms associés et les images associées appartiennent à leurs détenteurs de droits respectifs. Ce site est un outil d'information destiné à la communauté de fans.",
            },
          ],
        },
        {
          title: "Contact",
          blocks: [
            {
              type: "paragraph",
              text: "Pour signaler une erreur, demander une suppression ou pour toute autre question, contactez-nous à {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Contact",
        description:
          "Coordonnées pour signaler des bugs, proposer des fonctionnalités et poser des questions sur le fonctionnement de Brawl Status KR.",
      },
      back: "Retour à la recherche de joueur",
      title: "Contact",
      intro:
        "Si vous rencontrez une erreur sur le site, souhaitez proposer une fonctionnalité ou poser une question sur les données, contactez-nous à l'adresse e-mail ci-dessous.",
      sections: [
        {
          title: "Contact de l'opérateur",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Informations utiles à joindre",
          blocks: [
            {
              type: "list",
              items: [
                "Adresse de la page où le problème s'est produit",
                "Tag joueur recherché",
                "Message d'erreur ou capture d'écran",
                "Appareil et navigateur utilisés",
              ],
            },
          ],
        },
      ],
    },
  },
  it: {
    about: {
      metadata: {
        title: "Informazioni sul servizio",
        description:
          "Scopri la ricerca dei profili, l'analisi delle battaglie recenti, i consigli dei brawler per mappa e il catalogo skin di Brawl Status KR.",
      },
      back: "Torna alla ricerca giocatore",
      title: "Informazioni su Brawl Status KR",
      intro:
        "Brawl Status KR è uno strumento di analisi creato dai fan che aiuta i giocatori di Brawl Stars a controllare rapidamente la cronologia delle battaglie e lo stato dei brawler posseduti.",
      sections: [
        {
          title: "Funzioni principali",
          blocks: [
            {
              type: "list",
              items: [
                "Ricerca di profilo e battaglie recenti tramite tag giocatore",
                "Visualizzazione di percentuale di vittorie, vittorie e sconfitte, modalità principale e dettagli delle ultime 25 battaglie",
                "Visualizzazione di gadget, abilità stellari, Hypercharge, equipaggiamenti e skin dei brawler posseduti",
                "Consigli dei brawler per mappa basati su tutti i campioni di battaglia salvati nel database",
                "Ricerca nel catalogo delle skin per brawler, con prezzo e rarità",
              ],
            },
          ],
        },
        {
          title: "Base dei dati",
          blocks: [
            {
              type: "paragraph",
              text: "La cronologia delle battaglie viene raccolta entro il limite delle 25 battaglie più recenti fornite dall'API ufficiale. Per statistiche cumulative più precise, consigliamo una ricerca ogni 25 battaglie.",
            },
          ],
        },
        {
          title: "Avviso sul sito fan non ufficiale",
          blocks: [
            {
              type: "paragraph",
              text: "Questo è un servizio non ufficiale creato dai fan, senza affiliazione, sponsorizzazione o approvazione da parte di Supercell. I nomi e le immagini relativi a Brawl Stars appartengono ai rispettivi titolari dei diritti.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Metodologia",
        description:
          "Spiega i campioni basati sulle ricerche, la deduplicazione delle battaglie, il calcolo delle battaglie a squadre e Showdown e i limiti del punteggio di consiglio di Brawl Status KR.",
      },
      title: "Metodologia",
      eyebrow: "Metodologia",
      description:
        "Spieghiamo quali battaglie vengono usate per i consigli e le statistiche cumulative e cosa quei valori non rappresentano.",
      sections: [
        {
          title: "Non sono statistiche ufficiali di tutti i giocatori",
          blocks: [
            {
              type: "paragraph",
              text: "Le statistiche del database del sito sono un campione cumulativo delle battaglie recenti ricevute quando viene cercato un tag giocatore. Il campione può essere sbilanciato verso regioni, fasce di abilità o community che effettuano più ricerche, e il numero di tag unici salvati non coincide con il numero di utenti unici.",
            },
          ],
        },
        {
          title: "Salviamo fino alle 25 battaglie più recenti",
          blocks: [
            {
              type: "paragraph",
              text: "La risposta ufficiale della cronologia copre fino alle 25 battaglie più recenti. Quando lo stesso tag viene cercato di nuovo, le battaglie già salvate vengono ignorate tramite vincoli UNIQUE sull'orario e sull'impronta della battaglia. L'impronta usa orario, modalità, mappa e tag ordinati dei partecipanti.",
            },
          ],
        },
        {
          title: "Battaglie a squadre e Showdown vengono calcolati in modo diverso",
          blocks: [
            {
              type: "list",
              items: [
                "Nelle normali battaglie tra due squadre, ogni impronta della battaglia viene selezionata una sola volta, quindi i partecipanti di entrambe le squadre vengono espansi per calcolare i risultati della squadra vincente e di quella avversaria.",
                "In Showdown Duo e Trio, anche con più squadre, l'API non fornisce il risultato individuale di ogni avversario; viene quindi usato solo il piazzamento dal punto di vista del giocatore cercato.",
                "Le battaglie amichevoli sono escluse dai consigli e dalle statistiche cumulative sulla percentuale di vittorie.",
              ],
            },
          ],
        },
        {
          title: "I consigli appaiono solo con almeno 5 battaglie",
          blocks: [
            {
              type: "paragraph",
              text: "Quando una combinazione mappa-brawler ha almeno 5 battaglie, mostriamo insieme percentuale di vittorie e dimensione del campione. Il punteggio di consiglio è un valore interno che riduce maggiormente il peso della percentuale di vittorie quando il campione è piccolo; 5 battaglie non garantiscono rappresentatività. I valori mostrati possono restare in cache fino a 60 secondi.",
            },
          ],
        },
        {
          title: "Hai trovato un errore?",
          blocks: [
            {
              type: "paragraph",
              text: "Se traduzioni di mappe o modalità, risultati o dimensioni del campione sembrano diversi dal gioco, segnalalo tramite il modulo sull'accuratezza dei dati nel repository pubblico. Oscura parte del tag giocatore anche se è necessario per riprodurre il problema.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Lascia un feedback su GitHub",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Informativa sulla privacy",
        description:
          "Informazioni sulla raccolta e l'uso dei dati, sui cookie, sulla pubblicità e sulle API esterne di Brawl Status KR.",
      },
      back: "Torna alla ricerca giocatore",
      title: "Informativa sulla privacy",
      effectiveDate: "Data di entrata in vigore: 22 settembre 2026",
      intro:
        "Brawl Status KR non raccoglie dati personali inutilmente e tratta solo le informazioni minime necessarie per fornire e migliorare il servizio.",
      sections: [
        {
          title: "Informazioni raccolte",
          blocks: [
            {
              type: "list",
              items: [
                "Tag giocatore di Brawl Stars inserito dall'utente",
                "Profilo di gioco pubblico e cronologia delle battaglie recenti ottenuti tramite l'API ufficiale",
                "Log di accesso di base per la sicurezza del servizio e la gestione degli errori",
                "Indirizzo e-mail e contenuto della richiesta quando l'utente invia un'e-mail di contatto",
              ],
            },
          ],
        },
        {
          title: "Finalità dell'uso dei dati",
          blocks: [
            {
              type: "list",
              items: [
                "Cercare lo storico del giocatore e mostrare le battaglie recenti",
                "Calcolare percentuali di vittorie cumulative per brawler e statistiche di consiglio per mappa",
                "Correggere errori, impedire richieste malevole e migliorare la stabilità del servizio",
                "Rispondere alle richieste e valutare miglioramenti delle funzioni",
              ],
            },
          ],
        },
        {
          title: "Cookie e pubblicità",
          blocks: [
            {
              type: "paragraph",
              text: "Il servizio attualmente non offre funzioni di accesso. Se in futuro verranno introdotti servizi pubblicitari come Google AdSense, i fornitori di annunci potranno usare cookie o tecnologie simili per mostrare annunci e misurarne le prestazioni. Gli utenti possono limitare o eliminare i cookie dalle impostazioni del browser.",
            },
          ],
        },
        {
          title: "Servizi di terze parti",
          blocks: [
            {
              type: "paragraph",
              text: "Per recuperare informazioni sul giocatore e cronologia delle battaglie possono essere usati Brawl Stars API o un proxy API. Per il funzionamento e la distribuzione del sito possono essere usate infrastrutture esterne come Vercel e GitHub.",
            },
            {
              type: "paragraph",
              text: "La consultazione ausiliaria delle skin possedute è disattivata per impostazione predefinita. Solo quando l'operatore la abilita esplicitamente il tag pubblico cercato dall'utente può essere inviato a Brawlace; Jina Reader viene usato dopo un errore della richiesta diretta solo se anche questo fallback è stato abilitato separatamente. Quando una consultazione completa riesce, il risultato può essere memorizzato temporaneamente nel localStorage dello stesso browser per un massimo di 24 ore; questa cache non viene usata se il provider ausiliario è disattivato.",
            },
            {
              type: "paragraph",
              text: "Le informazioni di catalogo su mappe, modalità, brawler ed eventi vengono recuperate da BrawlAPI e queste richieste non inviano il tag giocatore inserito dall'utente. Alcune immagini, tra cui brawler, mappe e badge, vengono caricate da remoto dal CDN di Brawlify, quindi il browser può inviare richieste di immagini a quel CDN.",
            },
          ],
        },
        {
          title: "Periodo di conservazione",
          blocks: [
            {
              type: "paragraph",
              text: "Attualmente non viene applicata alcuna eliminazione automatica tramite TTL. La cronologia delle battaglie e i dati statistici vengono conservati durante il funzionamento del servizio per fornire il servizio e mantenere la qualità delle statistiche e possono essere eliminati quando il servizio termina, i dati operativi vengono reimpostati o viene gestita una richiesta verificata relativa ai dati. Le e-mail di contatto vengono conservate per il tempo necessario a gestire la richiesta e le eventuali controversie.",
            },
            {
              type: "paragraph",
              text: "Poiché non è possibile verificare il proprietario usando solo un tag pubblico, non è prevista una funzione di eliminazione automatica. Le richieste relative ai dati vengono esaminate singolarmente dall'operatore tramite il contatto indicato sotto.",
            },
          ],
        },
        {
          title: "Contatti",
          blocks: [
            {
              type: "paragraph",
              text: "Per domande relative alla privacy, contattaci all'indirizzo {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Condizioni d'uso",
        description:
          "Criteri dei dati, avviso di servizio non ufficiale e ambito di responsabilità nell'uso di Brawl Status KR.",
      },
      back: "Torna alla ricerca giocatore",
      title: "Condizioni d'uso",
      sections: [
        {
          title: "Natura del servizio",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR è uno strumento di analisi non ufficiale creato dai fan per i giocatori di Brawl Stars. Non è affiliato, sponsorizzato o approvato da Supercell e non è un servizio ufficiale.",
            },
          ],
        },
        {
          title: "Accuratezza dei dati",
          blocks: [
            {
              type: "paragraph",
              text: "Storico e statistiche sono calcolati dalle risposte di API esterne e dalla cronologia delle battaglie salvata nel database di questo servizio. Possono differire dalle informazioni nel gioco a causa di ritardi o dati mancanti nelle API, aggiornamenti del gioco o diverse frequenze di ricerca.",
            },
          ],
        },
        {
          title: "Ricerca consigliata ogni 25 battaglie",
          blocks: [
            {
              type: "paragraph",
              text: "La cronologia ufficiale consente di recuperare solo fino alle 25 battaglie più recenti. Per accumulare statistiche più precise, consigliamo di cercare il tag giocatore una volta ogni 25 battaglie.",
            },
          ],
        },
        {
          title: "Marchi e copyright",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, i nomi correlati e le immagini correlate appartengono ai rispettivi titolari dei diritti. Questo sito è uno strumento informativo pensato per la comodità dei fan.",
            },
          ],
        },
        {
          title: "Contatti",
          blocks: [
            {
              type: "paragraph",
              text: "Per segnalazioni di errori, richieste di eliminazione o altre domande, contattaci all'indirizzo {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Contatti",
        description:
          "Recapiti per segnalare bug, proporre funzioni e inviare richieste operative su Brawl Status KR.",
      },
      back: "Torna alla ricerca giocatore",
      title: "Contatti",
      intro:
        "Se trovi un errore durante l'uso del sito o hai una proposta di funzione o una domanda sui dati, contattaci all'indirizzo e-mail qui sotto.",
      sections: [
        {
          title: "Contatto dell'operatore",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Informazioni utili da includere",
          blocks: [
            {
              type: "list",
              items: [
                "Indirizzo della pagina in cui si è verificato il problema",
                "Tag giocatore cercato",
                "Messaggio di errore o schermata",
                "Dispositivo e browser utilizzati",
              ],
            },
          ],
        },
      ],
    },
  },
  ru: {
    about: {
      metadata: {
        title: "О сервисе",
        description:
          "Описание поиска статистики, анализа недавних боёв, рекомендаций бойцов по картам и каталога скинов Brawl Status KR.",
      },
      back: "Вернуться к поиску игрока",
      title: "О Brawl Status KR",
      intro:
        "Brawl Status KR — созданный фанатами аналитический инструмент, который помогает игрокам Brawl Stars быстро проверять историю боёв и состояние имеющихся бойцов.",
      sections: [
        {
          title: "Основные возможности",
          blocks: [
            {
              type: "list",
              items: [
                "Поиск профиля и недавней истории боёв по тегу игрока",
                "Просмотр процента побед, побед и поражений, основного режима и подробностей последних 25 боёв",
                "Просмотр гаджетов, звёздных сил, гиперзарядов, снаряжения и скинов имеющихся бойцов",
                "Рекомендации бойцов по картам на основе всех сохранённых в базе данных выборок боёв",
                "Поиск в каталоге скинов по бойцу, включая цены и редкость",
              ],
            },
          ],
        },
        {
          title: "Основа данных",
          blocks: [
            {
              type: "paragraph",
              text: "История боёв собирается в пределах максимум 25 последних боёв, предоставляемых официальным API. Для более точной накопительной статистики рекомендуется выполнять поиск после каждых 25 боёв.",
            },
          ],
        },
        {
          title: "Уведомление о неофициальном фан-сайте",
          blocks: [
            {
              type: "paragraph",
              text: "Это неофициальный сервис, созданный фанатами и не связанный с Supercell, не спонсируемый и не одобренный ею. Названия и изображения, связанные с Brawl Stars, принадлежат соответствующим правообладателям.",
            },
          ],
        },
      ],
    },
    methodology: {
      metadata: {
        title: "Методика расчёта",
        description:
          "Описание поисковой выборки Brawl Status KR, устранения дублей боёв, учёта командных боёв и Showdown и ограничений рекомендательного рейтинга.",
      },
      title: "Методика расчёта",
      eyebrow: "Методология",
      description:
        "Здесь объясняется, какие бои используются для рекомендаций и накопительной статистики и чего эти показатели не означают.",
      sections: [
        {
          title: "Это не официальная статистика всех игроков",
          blocks: [
            {
              type: "paragraph",
              text: "Статистика базы данных сайта представляет собой накопленную выборку недавних боёв, полученных при поиске тегов игроков. Выборка может быть смещена в сторону регионов, уровней навыка или сообществ, где поиск выполняют чаще, а число уникальных сохранённых тегов не равно числу уникальных пользователей.",
            },
          ],
        },
        {
          title: "Мы сохраняем до 25 последних боёв",
          blocks: [
            {
              type: "paragraph",
              text: "Официальный ответ истории боёв охватывает максимум 25 последних боёв. При повторном поиске того же тега уже сохранённые бои пропускаются благодаря ограничениям UNIQUE по времени и отпечатку боя. Отпечаток использует время, режим, карту и отсортированные теги участников.",
            },
          ],
        },
        {
          title: "Командные бои и Showdown рассчитываются по-разному",
          blocks: [
            {
              type: "list",
              items: [
                "В обычных боях двух команд каждый отпечаток боя выбирается один раз, после чего участники обеих команд разворачиваются для расчёта результатов победившей и противоположной команд.",
                "В Duo и Trio Showdown даже при нескольких командах API не предоставляет отдельный результат каждого соперника, поэтому используется только место с точки зрения найденного игрока.",
                "Дружеские бои исключаются из рекомендаций и накопительной статистики процента побед.",
              ],
            },
          ],
        },
        {
          title: "Рекомендации показываются только при выборке от 5 боёв",
          blocks: [
            {
              type: "paragraph",
              text: "Если для сочетания карты и бойца есть не менее 5 боёв, вместе показываются процент побед и размер выборки. Рекомендательный балл — внутренний показатель, который сильнее снижает влияние процента побед при маленькой выборке; 5 боёв не гарантируют репрезентативность. Значения на экране могут кэшироваться до 60 секунд.",
            },
          ],
        },
        {
          title: "Нашли ошибку?",
          blocks: [
            {
              type: "paragraph",
              text: "Если переводы карт или режимов, результаты или размеры выборки отличаются от игры, сообщите об этом через форму точности данных в публичном репозитории. Частично скрывайте тег игрока, даже если он нужен для воспроизведения проблемы.",
            },
            {
              type: "action",
              action: "githubIssues",
              label: "Оставить отзыв на GitHub",
            },
          ],
        },
      ],
    },
    privacy: {
      metadata: {
        title: "Политика конфиденциальности",
        description:
          "Информация о сборе и использовании данных, cookie, рекламе и внешних API в Brawl Status KR.",
      },
      back: "Вернуться к поиску игрока",
      title: "Политика конфиденциальности",
      effectiveDate: "Дата вступления в силу: 22 сентября 2026 г.",
      intro:
        "Brawl Status KR не собирает лишние персональные данные и обрабатывает только минимальный объём информации, необходимый для работы и улучшения сервиса.",
      sections: [
        {
          title: "Какие данные мы собираем",
          blocks: [
            {
              type: "list",
              items: [
                "Тег игрока Brawl Stars, введённый пользователем",
                "Публичный игровой профиль и история недавних боёв, полученные через официальный API",
                "Базовые журналы доступа для безопасности сервиса и обработки ошибок",
                "Адрес электронной почты и содержание обращения, если пользователь отправляет письмо",
              ],
            },
          ],
        },
        {
          title: "Для чего используются данные",
          blocks: [
            {
              type: "list",
              items: [
                "Поиск статистики игрока и показ недавней истории боёв",
                "Расчёт накопительного процента побед по бойцам и рекомендательной статистики по картам",
                "Исправление ошибок, предотвращение вредоносных запросов и повышение стабильности сервиса",
                "Ответы на обращения и рассмотрение улучшений функций",
              ],
            },
          ],
        },
        {
          title: "Cookie и реклама",
          blocks: [
            {
              type: "paragraph",
              text: "Сейчас сервис не предоставляет функцию входа. Если в будущем будут подключены рекламные сервисы, например Google AdSense, поставщики рекламы смогут использовать cookie или похожие технологии для показа рекламы и измерения эффективности. Пользователь может ограничить или удалить cookie в настройках браузера.",
            },
          ],
        },
        {
          title: "Сторонние сервисы",
          blocks: [
            {
              type: "paragraph",
              text: "Для получения информации об игроке и истории боёв могут использоваться Brawl Stars API или API-прокси. Для работы и развёртывания сайта может использоваться внешняя инфраструктура, например Vercel и GitHub.",
            },
            {
              type: "paragraph",
              text: "Вспомогательный запрос списка имеющихся скинов по умолчанию отключён. Публичный тег игрока может передаваться Brawlace только если оператор явно включил эту функцию; Jina Reader используется после ошибки прямого запроса только если резервный путь также включён отдельно. После успешного получения полного списка результат может временно храниться в localStorage того же браузера до 24 часов; если дополнительный провайдер отключён, этот кэш не используется.",
            },
            {
              type: "paragraph",
              text: "Каталожные данные о картах, режимах, бойцах и событиях запрашиваются у BrawlAPI, и в этих запросах не передаётся введённый пользователем тег игрока. Некоторые изображения, включая бойцов, карты и значки, загружаются удалённо из CDN Brawlify, поэтому браузер может отправлять этому CDN запросы изображений.",
            },
          ],
        },
        {
          title: "Срок хранения",
          blocks: [
            {
              type: "paragraph",
              text: "Автоматическое удаление по TTL сейчас не применяется. История боёв и статистические данные хранятся в течение работы сервиса для его предоставления и поддержания качества статистики и могут быть удалены при завершении работы сервиса, сбросе операционных данных или обработке подтверждённого запроса, связанного с записями. Письма с обращениями хранятся в течение срока, необходимого для обработки запроса и возможных споров.",
            },
            {
              type: "paragraph",
              text: "Поскольку только по публичному тегу игрока нельзя подтвердить владельца, автоматическое удаление не предоставляется. Запросы, связанные с записями, оператор рассматривает индивидуально через контакт, указанный ниже.",
            },
          ],
        },
        {
          title: "Контакты",
          blocks: [
            {
              type: "paragraph",
              text: "По вопросам конфиденциальности пишите на {email}.",
            },
          ],
        },
      ],
    },
    terms: {
      metadata: {
        title: "Условия использования",
        description:
          "Правила данных, уведомление о неофициальном сервисе и пределы ответственности при использовании Brawl Status KR.",
      },
      back: "Вернуться к поиску игрока",
      title: "Условия использования",
      sections: [
        {
          title: "Характер сервиса",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Status KR — неофициальный аналитический инструмент, созданный фанатами для игроков Brawl Stars. Он не связан с Supercell, не спонсируется и не одобрен ею и не является официальным сервисом.",
            },
          ],
        },
        {
          title: "Точность данных",
          blocks: [
            {
              type: "paragraph",
              text: "Статистика и история рассчитываются на основе ответов внешних API и истории боёв, сохранённой в базе данных сервиса. Они могут отличаться от данных в игре из-за задержек или пропусков API, обновлений игры или различий в частоте поиска.",
            },
          ],
        },
        {
          title: "Рекомендуется поиск после каждых 25 боёв",
          blocks: [
            {
              type: "paragraph",
              text: "Официальная история боёв позволяет получить только до 25 последних боёв. Для более точной накопительной статистики рекомендуется искать тег игрока после каждых 25 боёв.",
            },
          ],
        },
        {
          title: "Товарные знаки и авторские права",
          blocks: [
            {
              type: "paragraph",
              text: "Brawl Stars, связанные названия и изображения принадлежат соответствующим правообладателям. Этот сайт является информационным инструментом для удобства фанатов.",
            },
          ],
        },
        {
          title: "Контакты",
          blocks: [
            {
              type: "paragraph",
              text: "Для сообщений об ошибках, запросов на удаление и других вопросов пишите на {email}.",
            },
          ],
        },
      ],
    },
    contact: {
      metadata: {
        title: "Контакты",
        description:
          "Контактная информация для сообщений об ошибках, предложений функций и вопросов по работе Brawl Status KR.",
      },
      back: "Вернуться к поиску игрока",
      title: "Контакты",
      intro:
        "Если вы обнаружили ошибку при использовании сайта, хотите предложить функцию или задать вопрос о данных, напишите на указанный ниже адрес электронной почты.",
      sections: [
        {
          title: "Контакт оператора",
          blocks: [{ type: "paragraph", text: "{email}" }],
        },
        {
          title: "Что полезно указать в обращении",
          blocks: [
            {
              type: "list",
              items: [
                "Адрес страницы, где возникла проблема",
                "Тег игрока, который вы искали",
                "Сообщение об ошибке или снимок экрана",
                "Используемые устройство и браузер",
              ],
            },
          ],
        },
      ],
    },
  },
};

export function getDocumentPageMessages(locale: Locale) {
  return documentPageMessages[locale];
}
