// Builtin generation engine ("builtin mode").
//
// Deterministic, template-driven content generation for every agent task.
// It is the DEFAULT provider so the whole platform works with zero
// credentials. Hard rules baked in:
//   - never invent Arendora features, prices, customers or statistics;
//   - if a specific fact is unknown, the copy asks the reader or says
//     "unknown" instead of fabricating;
//   - every platform gets a structurally and stylistically distinct piece.

export type MockTask = "research" | "ideas" | "content_variant" | "video_package" | "seo_article";

export type MockContext = Record<string, unknown>;

// ---------------------------------------------------------------- helpers

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string): T {
  return arr[hashString(seed) % arr.length];
}

function str(ctx: MockContext, key: string, fallback = ""): string {
  const v = ctx[key];
  return typeof v === "string" ? v : fallback;
}

function list(ctx: MockContext, key: string): string[] {
  const v = ctx[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function siteUrl(): string {
  return str(process.env as unknown as MockContext, "PUBLIC_SITE_URL", "arendora.ru");
}

/** Short idea phrase woven into copy so different ideas never collide. */
function shortIdea(ideaTitle: string): string {
  const t = ideaTitle.replace(/\s+/g, " ").trim();
  return t.length > 90 ? t.slice(0, 87) + "..." : t;
}

const CTA_SAFE = "Ведите объекты, арендаторов и платежи в Arendora → arendora.ru";

// ---------------------------------------------------------------- research

const PAIN_POINTS = [
  {
    title: "Платежи собираются вручную: скриншоты переводов в мессенджере вместо учёта",
    summary:
      "Арендодатели с портфелем от 3 объектов подтверждают оплату по скриншотам и переводам в Telegram. Кто и за какой месяц заплатил - восстанавливается по памяти в конце месяца. Ошибки находят позже, чем хотелось бы.",
    evidence: { signal: "recurrent_theme", confidence: "high", source: "domain_research_pool" },
  },
  {
    title: "Учёт в Excel ломается, когда объектов становится больше трёх",
    summary:
      "Таблицы ведутся вручную: даты платежей, депозиты, коммунальные платежи, индексация. Один пропущенный столбец или версия файла 'финал_2' - и данные расходятся между собственниками и управляющими.",
    evidence: { signal: "recurrent_theme", confidence: "high", source: "domain_research_pool" },
  },
  {
    title: "Долги арендаторов замечают с опозданием на 2-4 недели",
    summary:
      "Без единой системы напоминаний просрочка платежа обнаруживается, когда собственник сам вспомнит проверить. К этому моменту долг уже накоплен, а разговор с арендатором превращается в конфликт.",
    evidence: { signal: "recurrent_theme", confidence: "medium", source: "domain_research_pool" },
  },
  {
    title: "Информация о объектах разложена по заметкам, чатам и голове",
    summary:
      "Контакты арендаторов в телефоне, условия аренды в договоре, история ремонта в переписке, планы в заметках. Когда объектом занимается второй человек (управляющий, родственник), собрать картину целиком не получается.",
    evidence: { signal: "recurrent_theme", confidence: "high", source: "domain_research_pool" },
  },
  {
    title: "Нет ответа на главный вопрос: сколько приносит портфель",
    summary:
      "Доходность по объектам считают редко и вручную. Без вычета расходов цифра в голове обычно оптимистичнее реальной, поэтому решения о продаже или ремонте принимаются вслепую.",
    evidence: { signal: "recurrent_theme", confidence: "medium", source: "domain_research_pool" },
  },
];

const TRENDS = [
  {
    title: "Арендодатели уходят от мессенджер-учёта к сервисам",
    summary:
      "Растёт запрос на специализированные сервисы управления арендой вместо связки Excel + Telegram. Люди ищут напоминания, историю платежей и отчёт по портфелю в одном месте.",
    evidence: { signal: "category_demand", confidence: "medium", source: "domain_research_pool" },
  },
  {
    title: "Короткие видео-обзоры продукта обгоняют текстовые обзоры по доверию",
    summary:
      "Собственники хотят видеть интерфейс и реальный сценарий работы, а не абстрактные обещания. Формат 'экран + 40 секунд сценария' вызывает больше вопросов в комментариях, чем статичный пост.",
    evidence: { signal: "format_trend", confidence: "medium", source: "domain_research_pool" },
  },
];

const COMPETITOR_TOPICS = [
  {
    title: "Тема 'Excel vs сервис для аренды' собирает активную дискуссию",
    summary:
      "Сравнительные форматы стабильно обсуждаются. Мы не копируем чужие тексты - но сама тема сравнения вручную vs система актуальна и для нашей аудитории.",
    evidence: { signal: "topic_discussion", confidence: "medium", source: "domain_research_pool" },
  },
  {
    title: "Тема 'как принимать платежи' - вечнозелёная в нише",
    summary:
      "Порядок приёма, подтверждения, депозиты и залоги регулярно поднимаются в сообществах арендодателей. Повод дать полезный материал без продаж в лоб.",
    evidence: { signal: "evergreen_topic", confidence: "high", source: "domain_research_pool" },
  },
];

const SEO_OPPORTUNITIES = [
  {
    title: "Информационные запросы про учёт аренды и платежей",
    summary:
      "Кластер запросов вокруг учёта платежей, напоминаний об оплате и доходности портфеля. Интент информационный: человеку нужен порядок действий, а не сразу продукт.",
    evidence: { signal: "keyword_cluster", confidence: "medium", source: "domain_research_pool" },
  },
  {
    title: "Сравнительный интент: таблицы против системы учёта",
    summary:
      "Запросы формата 'как вести учёт аренды' и 'программа для учёта арендаторов' подразумевают выбор инструмента. Подходит для кластера со статьёй-сравнением.",
    evidence: { signal: "keyword_cluster", confidence: "medium", source: "domain_research_pool" },
  },
];

const AUDIENCE_QUESTIONS = [
  {
    title: "Как напоминать арендатору об оплате, чтобы не портить отношения",
    summary:
      "Баланс между настойчивостью и вежливостью - частый вопрос. Тон имеет значение: автоматическое напоминание снимает личный конфликт.",
    evidence: { signal: "community_question", confidence: "high", source: "domain_research_pool" },
  },
  {
    title: "Что фиксировать по каждому объекту, чтобы ничего не терять",
    summary:
      "Арендодатели просят чек-лист данных: договор, депозит, счётчики, контакты, история платежей, ремонты. Хороший повод для полезного контента.",
    evidence: { signal: "community_question", confidence: "high", source: "domain_research_pool" },
  },
];

function researchItems(type: string, count: number, seed: string) {
  const pools: Record<string, typeof PAIN_POINTS> = {
    pain_point: PAIN_POINTS,
    trend: TRENDS,
    competitor_topic: COMPETITOR_TOPICS,
    seo_opportunity: SEO_OPPORTUNITIES,
    audience_question: AUDIENCE_QUESTIONS,
  };
  const pool = pools[type] ?? PAIN_POINTS;
  const out: unknown[] = [];
  for (let i = 0; i < count; i++) {
    const item = pool[(hashString(seed + type + i) + i) % pool.length];
    out.push({ ...item, type, source: "builtin_research_pool" });
  }
  return out;
}

// ---------------------------------------------------------------- ideas

const ANGLES = [
  { key: "pain_mirror", pattern: (t: string) => `Покажи боль как есть: ${t}` },
  { key: "how_to", pattern: (t: string) => `Пошаговый разбор: ${t}` },
  { key: "mistake", pattern: (t: string) => `Ошибка, которая дорого стоит: ${t}` },
  { key: "before_after", pattern: (t: string) => `Было/стало: ${t}` },
  { key: "checklist", pattern: (t: string) => `Чек-лист: ${t}` },
];

function ideas(count: number, seed: string, research: { title: string; summary: string }[]) {
  const out: unknown[] = [];
  const base = research.length > 0 ? research : [...PAIN_POINTS, ...AUDIENCE_QUESTIONS];
  for (let i = 0; i < count; i++) {
    const src = base[(hashString(seed + i) + i * 3) % base.length];
    const angle = ANGLES[(hashString(seed + "angle" + i) + i) % ANGLES.length];
    out.push({
      title: src.title,
      angle: angle.pattern(src.title),
      angleKey: angle.key,
      researchTitle: src.title,
      rationale: `Опирается на исследовательский инсайт: "${src.title}". Подходит аудитории собственников с 3-30 объектами.`,
    });
  }
  return out;
}

// ------------------------------------------------------------ content variants

interface VariantInput {
  kind: string;
  ideaTitle: string;
  angle?: string;
  insights?: string[];
  tone?: string;
  language?: string;
  seed?: string;
}

function hookFor(ideaTitle: string, kind: string, seed = ""): string {
  const hooks = [
    `Если у вас 3+ объекта и учёт в таблице - это про вас.`,
    `Скриншоты переводов - это не учёт платежей.`,
    `Самая дорогая ошибка арендодателя делается тихо.`,
    `Где вы узнаёте о просрочке: в приложении или из памяти?`,
    `Один экран, который экономит вечер в конце месяца.`,
  ];
  return pick(hooks, ideaTitle + kind + seed);
}

function tiktokScript(v: VariantInput) {
  const hook = hookFor(v.ideaTitle, "tiktok", v.seed);
  const scenes = [
    {
      timecode: "0-3с",
      visual: "Экран телефона/компьютера: интерфейс Arendora, список объектов.",
      voiceover: hook,
      onScreenText: hook,
    },
    {
      timecode: "3-12с",
      visual: "Скринкаст: открываем карточку объекта, показываем арендатора и статус платежа.",
      voiceover: `Тема разбора: ${shortIdea(v.ideaTitle)}. Обычная ситуация: платежи в переписке, а в конце месяца вы по памяти собираете, кто заплатил.`,
      onScreenText: "Платежи в переписке = учёт по памяти",
    },
    {
      timecode: "12-25с",
      visual: "Скринкаст: раздел платежей - статусы оплат по месяцам, отмечаем платёж.",
      voiceover:
        "Смотрите, как это выглядит в системе: по каждому объекту видно, что оплачено, а что просрочено. Напоминание арендатору не зависит от вашей памяти.",
      onScreenText: "Оплачено / просрочено - видно сразу",
    },
    {
      timecode: "25-35с",
      visual: "Скринкаст: обзор портфеля - список объектов и сводка.",
      voiceover:
        "И финальный экран: портфель целиком. Не 'кажется, всё нормально', а конкретика по каждому объекту.",
      onScreenText: "Портфель целиком - один экран",
    },
    {
      timecode: "35-40с",
      visual: "Экран: логотип и адрес сайта.",
      voiceover: CTA_SAFE,
      onScreenText: CTA_SAFE,
    },
  ];
  return {
    hook,
    scenes,
    voiceoverFull: scenes.map((s) => s.voiceover).join(" "),
    visualNotes: [
      "Приоритет - записи экрана продукта, без AI-аватаров.",
      "Курсор и клики видны: зритель должен проследить сценарий.",
      "Титры поверх видео обязательны: многие смотрят без звука.",
    ],
    captions: `${hook}\n\n${shortIdea(v.ideaTitle)} - разбор в видео.`,
    cta: CTA_SAFE,
    title: v.ideaTitle,
    thumbnail: "Скрин интерфейса Arendora с одним крупным статусом платежа и текстом-хуком поверх.",
  };
}

function igReel(v: VariantInput) {
  const hook = pick(
    [
      `Три объекта - и уже хаос? Знакомо.`,
      `Что должно быть видно по каждому объекту за 10 секунд.`,
      `Порядок в аренде начинается не с таблицы.`,
      `Проверьте прямо сейчас: что вы знаете о платежах за прошлый месяц?`,
    ],
    v.ideaTitle + "ig_reel" + (v.seed ?? ""),
  );
  return {
    hook,
    beatByBeat: [
      { beat: "Хук (0-2с)", direction: `Крупный титр: "${hook}". Фон - экран Arendora.` },
      {
        beat: "Сценарий (2-15с)",
        direction:
          "Скринкаст: карточка объекта → арендатор → статус платежа. Спокойный темп, без спешки.",
      },
      {
        beat: "Выгода (15-25с)",
        direction:
          "Скринкаст: сводка по портфелю. Титр: 'Объекты, арендаторы, платежи и доходность - в одном месте'.",
      },
      { beat: "CTA (25-30с)", direction: `Финальный кадр: логотип, текст "${CTA_SAFE}".` },
    ],
    caption:
      `${hook}\n\n${shortIdea(v.ideaTitle)}.\n\nArendora - сервис для собственников: объекты, арендаторы, платежи и портфель в одном месте. ` +
      `Сохраните, если учёт до сих пор в таблицах.`,
    hashtags: ["#аренда", "#арендодатели", "#недвижимость", "#сдаюквартиру", "#arendora"],
    cta: CTA_SAFE,
  };
}

function igCarousel(v: VariantInput) {
  const slides = [
    {
      headline: "Если у вас 3+ объекта и всё в таблице",
      body: `Разбор: ${shortIdea(v.ideaTitle)}. Листайте.`,
      visual: "Крупный текст на фирменном фоне, внизу логотип.",
    },
    {
      headline: "Что обычно теряется",
      body: "История платежей живёт в переписке, условия - в договоре, договорённости - в памяти.",
      visual: "Скрин переписки (заглушённые имена) + иконки разбросанных файлов.",
    },
    {
      headline: "Объекты",
      body: "По каждому объекту: арендатор, срок, ставка, депозит. Одна карточка - вся картина.",
      visual: "Скринкаст: карточка объекта в Arendora.",
    },
    {
      headline: "Платежи",
      body: "Статусы оплат по месяцам видно сразу, без ручных пометок.",
      visual: "Скринкаст: раздел платежей.",
    },
    {
      headline: "Напоминания",
      body: "Арендатор получает напоминание об оплате - без личного конфликта.",
      visual: "Скринкаст: напоминание по платежу.",
    },
    {
      headline: "Портфель",
      body: "Сводка по всем объектам: что работает, что требует внимания.",
      visual: "Скринкаст: обзор портфеля.",
    },
    {
      headline: "Как начать",
      body: CTA_SAFE,
      visual: "Финальный слайд: логотип, адрес сайта, кнопка-приглашение.",
    },
  ];
  return {
    slides,
    caption:
      "Порядок в аренде - это не таблица, а система: объекты, арендаторы, платежи и портфель в одном месте.",
    hashtags: ["#арендажилья", "#собственник", "#недвижимость", "#учётаренды", "#arendora"],
    cta: CTA_SAFE,
  };
}

function xPost(v: VariantInput) {
  const text = pick(
    [
      "Скриншоты переводов - это не учёт платежей. Это расследование в конце месяца.",
      "Аренда 3+ объектов в таблице работает ровно до первого пропущенного платежа.",
      "Вопрос собственнику: где вы узнаёте о просрочке - в системе или из памяти?",
      "Порядок в аренде - это не 'сильная воля', а один экран со статусами платежей.",
    ],
    v.ideaTitle + "x" + (v.seed ?? ""),
  );
  const payload = { text: text.slice(0, 260), cta: siteUrl() };
  return payload;
}

function xThread(v: VariantInput) {
  const tweets = [
    `"${shortIdea(v.ideaTitle)}" - с этого разговора обычно и начинается наведение порядка в аренде.`,
    "Что теряется первым:\n- история платежей (в переписке)\n- договорённости (в памяти)\n- доходность по объектам (не считается)",
    "Что даёт система: карточка объекта, статусы платежей по месяцам, напоминания арендатору и сводка по портфелю.",
    "Ничего из этого не требует 'внедрения на месяц'. Начать можно с переноса текущих объектов. " + siteUrl(),
  ];
  return { tweets: tweets.map((t) => t.slice(0, 275)), cta: siteUrl() };
}

function threadsPost(v: VariantInput) {
  const text = pick(
    [
      "Заметил у знакомых собственников одну и ту же эволюцию: сначала всё в таблице, потом таблица + чат, потом 'я же помню'. Объектов становится больше - память не растёт. В какой точке этой эволюции вы сейчас?",
      "Платёж прошёл, но нигде не зафиксирован - это ещё не доход. Доход появляется, когда по каждому объекту видно историю. Разница между 'кажется' и 'вижу' и есть разница между таблицей и системой.",
      "Хороший тест на порядок в аренде: попробуйте за 5 минут ответить, кто из арендаторов платит с задержкой и на сколько дней. Если ответ 'по памяти' - самое время собрать всё в одном месте.",
      "Собственники редко теряют деньги из-за плохих арендаторов. Чаще - из-за отсутствия системы: забытый платёж, неучтённый расход, решение на глаз. С чего вы начали бы наведение порядка?",
    ],
    v.ideaTitle + "threads" + (v.seed ?? ""),
  );
  return { text: `${text}\n\nТема: ${shortIdea(v.ideaTitle)}`.slice(0, 490), cta: CTA_SAFE };
}

function contentVariant(ctx: MockContext) {
  const v: VariantInput = {
    kind: str(ctx, "kind"),
    ideaTitle: str(ctx, "ideaTitle", "Учёт аренды"),
    angle: str(ctx, "angle"),
    insights: list(ctx, "insights"),
    language: str(ctx, "language", "ru"),
    seed: str(ctx, "seed"),
  };
  switch (v.kind) {
    case "tiktok_script":
      return tiktokScript(v);
    case "ig_reel":
      return igReel(v);
    case "ig_carousel":
      return igCarousel(v);
    case "x_post":
      return xPost(v);
    case "x_thread":
      return xThread(v);
    case "threads_post":
      return threadsPost(v);
    default:
      throw new Error(`Unknown variant kind: ${v.kind}`);
  }
}

// ------------------------------------------------------------- video package

function videoPackage(ctx: MockContext) {
  const v: VariantInput = {
    kind: str(ctx, "kind", "tiktok_script"),
    ideaTitle: str(ctx, "ideaTitle", "Учёт аренды"),
    seed: str(ctx, "seed"),
  };
  const script = tiktokScript(v);
  return {
    hook: script.hook,
    scenes: script.scenes,
    voiceover: script.voiceoverFull,
    visualInstructions: [
      "Снимайте реальный интерфейс Arendora: список объектов, карточка объекта, раздел платежей, сводка портфеля.",
      "Горизонтальные скринкасты 1080x1920 с увеличением ключевых областей.",
      "Без AI-аватаров: голос за кадром + экран продукта.",
      "Длительность 30-45 секунд, темп ровный, титры обязательны.",
    ],
    captions: script.captions,
    cta: script.cta,
    title: `${v.ideaTitle} | Arendora`,
    thumbnail:
      "Кадр интерфейса с крупным статусом платежа ('просрочено'/'оплачено') + короткий текст-хук сверху.",
  };
}

// ---------------------------------------------------------------- seo article

function seoArticle(ctx: MockContext) {
  const keyword = str(ctx, "keyword", "учёт аренды");
  const intent = str(ctx, "intent", "informational");
  const cluster = str(ctx, "cluster", "учёт аренды");
  const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  const title = `${capitalized}: как навести порядок в аренде без таблиц`;
  const metaDescription = `Практическое руководство: ${keyword} - что фиксировать по объектам, арендаторам и платежам, чтобы ничего не терялось. Чек-лист и порядок действий.`;
  const outline = [
    { h2: "Почему учёт в таблицах ломается по мере роста", points: ["ручной ввод", "версии файлов", "история в переписке"] },
    { h2: "Что фиксировать по каждому объекту", points: ["договор и срок", "арендатор и ставка", "депозит", "история платежей"] },
    { h2: "Платежи: как не терять ни одну оплату", points: ["статусы по месяцам", "просрочки видны сразу", "напоминания арендатору"] },
    { h2: "Доходность портфеля: простой порядок подсчёта", points: ["доход по объектам", "расходы", "сводка"] },
    { h2: "Как перевести учёт из таблиц в систему", points: ["перенос объектов", "привыкание за неделю", "проверка сводки"] },
  ];
  const body = [
    `# ${title}`,
    "",
    `Если вы сдаёте несколько объектов, вы знаете эту картину: платежи приходят переводами, подтверждения - скриншотами в мессенджере, а «отчётность» - это личная таблица, которую приходится обновлять вручную. Разберём, как выстроить ${keyword} так, чтобы ничего не терялось.`,
    "",
    `## ${outline[0].h2}`,
    "",
    "Таблица - хороший инструмент, пока объектов один-два и данные вносит один человек. Дальше появляются три проблемы: ручной ввод (опечатки и пропуски), версии файлов (какая из них актуальна?) и история договорённостей, которая живёт в переписке, а не в системе. Итог один: часть информации восстанавливается по памяти.",
    "",
    `## ${outline[1].h2}`,
    "",
    "Минимальный набор данных по объекту: договор и срок аренды, арендатор и контакты, ставка и дата платежа, депозит, показания счётчиков, история платежей и ремонтов. Если этих шести пунктов нет под рукой для каждого объекта - учёт неполный.",
    "",
    `## ${outline[2].h2}`,
    "",
    "Главный принцип: статус каждой оплаты должен быть виден без вопросов к памяти. В системе Arendora платежи по каждому объекту фиксируются по месяцам: оплачено, ожидается, просрочено. Просрочка видна сразу, а напоминание арендатору уходит автоматически - без неловкого личного разговора.",
    "",
    `## ${outline[3].h2}`,
    "",
    "Доходность считается по каждому объекту отдельно: доход от аренды минус расходы. Пока сводка не собрана, решения о ремонте или продаже принимаются на ощущениях. Порядок простой: сначала факты по каждому объекту, потом решение.",
    "",
    `## ${outline[4].h2}`,
    "",
    "Перенос в систему не требует 'проекта внедрения'. Практичный путь: завести все объекты, внести текущих арендаторов и ставки, дальше отмечать платежи по мере поступления. Через пару недель система сама становится источником правды, а таблица - архивом.",
    "",
    `**${CTA_SAFE}**`,
  ].join("\n\n");
  return {
    keyword,
    intent,
    cluster,
    title,
    metaDescription: metaDescription.slice(0, 158),
    h1: title,
    outline,
    body,
    internalLinks: [
      { anchor: "Управление объектами", target: "/features/properties", reason: "связанный кластер о карточке объекта" },
      { anchor: "Учёт платежей", target: "/features/payments", reason: "целевая страница кластера платежей" },
    ],
    faq: [
      {
        q: "С чего начать перевод учёта из таблиц?",
        a: "С переноса объектов и текущих арендаторов, дальше отмечать платежи по мере поступления.",
      },
      {
        q: "Сколько объектов можно вести?",
        a: "Arendora рассчитана на собственников с портфелем примерно от 3 до 30 объектов.",
      },
    ],
    cta: CTA_SAFE,
  };
}

// ---------------------------------------------------------------- entry point

export function runMockGenerator(task: MockTask, ctx: MockContext): unknown {
  switch (task) {
    case "research": {
      const count = typeof ctx.count === "number" ? ctx.count : 3;
      const type = str(ctx, "type", "pain_point");
      const seed = str(ctx, "seed", String(Date.now()));
      const types = ["pain_point", "trend", "competitor_topic", "seo_opportunity", "audience_question"];
      const out: unknown[] = [];
      for (let i = 0; i < count; i++) {
        const t = str(ctx, "singleType") || types[i % types.length];
        out.push(...researchItems(t, 1, seed + ":" + i));
      }
      return { items: out };
    }
    case "ideas": {
      const count = typeof ctx.count === "number" ? ctx.count : 5;
      const seed = str(ctx, "seed", String(Date.now()));
      const research = (ctx.research as { title: string; summary: string }[] | undefined) ?? [];
      return { ideas: ideas(count, seed, research) };
    }
    case "content_variant":
      return contentVariant(ctx);
    case "video_package":
      return videoPackage(ctx);
    case "seo_article":
      return seoArticle(ctx);
    default:
      throw new Error(`Unknown mock task: ${task}`);
  }
}
