import type { BehaviorGuideline, JobGrade } from "@/types/database";
import type { LocalTables } from "./tables.ts";

/**
 * Starting data for the local (no-database) mode.
 *
 * The wording of the masters -- 行動指針, 役職別ウェイト, 評価項目 -- is
 * transcribed from `supabase/seed.sql` and `supabase/seed_term_evaluation.sql`,
 * which stay the source of truth for when a real Supabase project is wired up.
 * If those files change, change these to match.
 *
 * The people and their reports are fictional. They exist so the whole
 * half-year workflow (期首 → 中間 → 期末 → 上長評価 → 二次承認 → 公開) can be
 * walked in one browser, which needs three levels of org chart: 山田's manager
 * is 佐藤, and 佐藤's manager 田中 is therefore 山田's second approver.
 */

export const DEMO_PASSWORD = "showa2026";

// Fixed ids so that a reseed does not invalidate a bookmarked URL.
const ID = {
  yamada: "11111111-1111-4111-8111-111111111111",
  suzuki: "22222222-2222-4222-8222-222222222222",
  sato: "33333333-3333-4333-8333-333333333333",
  tanaka: "44444444-4444-4444-8444-444444444444",
  admin: "55555555-5555-4555-8555-555555555555",
  periodH1: "aaaaaaaa-0000-4000-8000-000000000001",
  periodH2: "aaaaaaaa-0000-4000-8000-000000000002",
  termYamadaH1: "bbbbbbbb-0000-4000-8000-000000000001",
  termSuzukiH1: "bbbbbbbb-0000-4000-8000-000000000002",
};

const NOW = "2026-08-09T09:00:00.000Z";

/** 役職別評価ウェイト. Rows must each sum to 1.0 -- see the CHECK in 0003. */
const WEIGHTS: LocalTables["job_grade_weights"] = [
  { job_grade: "director", quantitative: 0.0, behavioral: 0.5, development: 0.5 },
  { job_grade: "bucho", quantitative: 0.5, behavioral: 0.1, development: 0.4 },
  { job_grade: "kacho", quantitative: 0.4, behavioral: 0.3, development: 0.3 },
  { job_grade: "kakaricho", quantitative: 0.3, behavioral: 0.5, development: 0.2 },
  { job_grade: "shunin", quantitative: 0.2, behavioral: 0.7, development: 0.1 },
  { job_grade: "ippan", quantitative: 0.1, behavioral: 0.8, development: 0.1 },
];

const GUIDELINE_TITLES = [
  "①地域・仲間との和に寄り添う存在であれ",
  "②地域社会の未来を想像し、創造する存在であれ",
  "③技術を磨くプロフェッショナルであれ",
  "④主体的にものごとを捉え、推進できる存在であれ",
  "⑤常に誠実であれ",
];

/**
 * Expected behaviour per grade, in guideline order. 取締役 and 部長 share the
 * same wording -- that is how the source sheet reads, not a transcription slip.
 */
const EXPECTED_BEHAVIOR: Record<JobGrade, string[]> = {
  director: [
    "社内外と信頼関係を築き、調和を守る。地域との共創を推進",
    "地域・行政・顧客と連携し、次世代に貢献",
    "技術伝承体制を整え、専門性を高める",
    "経営課題を把握し、全社視点で推進",
    "倫理観を持ち、組織の信頼を守る",
  ],
  bucho: [
    "社内外と信頼関係を築き、調和を守る。地域との共創を推進",
    "地域・行政・顧客と連携し、次世代に貢献",
    "技術伝承体制を整え、専門性を高める",
    "経営課題を把握し、全社視点で推進",
    "倫理観を持ち、組織の信頼を守る",
  ],
  kacho: [
    "部門連携を促し、チームの関係性を強化",
    "部門改善提案を推進し、発展を担う",
    "専門知識を深化させ、若手を育成",
    "部門方針を設計し、計画的に実行",
    "誠実な姿勢で部下・顧客と向き合う",
  ],
  kakaricho: [
    "職場の調整役として風通しを保つ",
    "担当業務内で改善を実行",
    "専門スキルを磨き、後輩に指導",
    "課の課題を捉え、改善を主導",
    "是正・報告を正確に行い、誠実対応",
  ],
  shunin: [
    "同僚・協力業者と円滑に連携",
    "現場・顧客の声を改善提案に反映",
    "正確・丁寧に遂行し、資格取得に努める",
    "課題を発見し提案・実行",
    "約束を守り信頼を積み上げる",
  ],
  ippan: [
    "仲間との協力を重視し、報連相を徹底",
    "日々の業務で課題意識を持つ",
    "知識・技術を吸収し成長する",
    "目標を意識して業務に取り組む",
    "礼儀と素直な姿勢で業務に臨む",
  ],
};

function behaviorGuidelines(): BehaviorGuideline[] {
  const rows: BehaviorGuideline[] = [];
  for (const grade of Object.keys(EXPECTED_BEHAVIOR) as JobGrade[]) {
    EXPECTED_BEHAVIOR[grade].forEach((expected, index) => {
      rows.push({
        id: `guideline-${grade}-${index + 1}`,
        sort_order: index + 1,
        title: GUIDELINE_TITLES[index],
        job_grade: grade,
        expected_behavior: expected,
      });
    });
  }
  return rows;
}

/** 山田's 2026上期 sheet, already marked by 佐藤 but not yet released. */
const H1_GOALS: {
  category: "quantitative" | "behavioral" | "development";
  title: string;
  selfComment: string;
  selfScore: number;
  managerComment: string;
  managerScore: number;
}[] = [
  {
    category: "quantitative",
    title: "研修の均質化を図るため、新入社員向け動画研修教材の素材確認をする",
    selfComment:
      "施工マニュアル動画の制作に着手し、撮影から編集までの運用体制を構築して順次作成を進めています。",
    selfScore: 4,
    managerComment: "体制構築は評価できます。完成時期の見通しを早めに共有してください。",
    managerScore: 3,
  },
  {
    category: "quantitative",
    title: "採用パンフレットのデザインから入稿データ作成までを完了させる",
    selfComment: "印刷会社の要件に合わせた入稿データの仕様調整を担当し、手配まで滞りなく進めました。",
    selfScore: 3,
    managerComment: "予定どおり完了しました。",
    managerScore: 3,
  },
  {
    category: "quantitative",
    title: "コーポレートサイト・採用サイトの更新マニュアルの作成",
    selfComment:
      "委託先でのサイト制作が未完了のため保留中です。納品後すぐ着手できるよう準備しています。",
    selfScore: 3,
    managerComment: "外部要因ですが、先に着手できる範囲の切り出しは可能だったと思います。",
    managerScore: 2,
  },
  {
    category: "behavioral",
    title: GUIDELINE_TITLES[0],
    selfComment: "式典の制作業務で営業課と密に連携し、仕様や進行の報連相を徹底しました。",
    selfScore: 4,
    managerComment: "部署をまたぐ調整をよく担ってくれました。",
    managerScore: 4,
  },
  {
    category: "behavioral",
    title: GUIDELINE_TITLES[1],
    selfComment: "社内の業務効率化という課題に対し、AI活用の取り組みをチームで推進しています。",
    selfScore: 4,
    managerComment: "現状に満足せず改善を提案する姿勢が続いています。",
    managerScore: 4,
  },
  {
    category: "behavioral",
    title: GUIDELINE_TITLES[2],
    selfComment: "二等無人航空機操縦士の学科試験に合格しました。",
    selfScore: 4,
    managerComment: "業務に直結する資格を自発的に取得しました。",
    managerScore: 4,
  },
  {
    category: "behavioral",
    title: GUIDELINE_TITLES[3],
    selfComment: "動画制作の運用体制を自ら構築し、スケジュールを意識して進めています。",
    selfScore: 4,
    managerComment: "主体性は十分。優先順位の判断は上長と擦り合わせましょう。",
    managerScore: 3,
  },
  {
    category: "behavioral",
    title: GUIDELINE_TITLES[4],
    selfComment: "目標未達の現状を真摯に受け止め、原因分析と改善に取り組んでいます。",
    selfScore: 3,
    managerComment: "未達を隠さず報告した点を評価します。",
    managerScore: 4,
  },
  {
    category: "development",
    title: "Instagramを各月4回更新し、フォロワー増加を目指す",
    selfComment: "月4回の投稿を継続しましたが、フォロワー数は目標に届きませんでした。",
    selfScore: 3,
    managerComment: "継続はできています。効果測定の設計が次の課題です。",
    managerScore: 3,
  },
  {
    category: "development",
    title: "二等無人航空機操縦士の学科試験を受験し、合格する",
    selfComment: "計画どおり学習を進め、6月に受験・合格しました。",
    selfScore: 4,
    managerComment: "計画的に達成しました。",
    managerScore: 4,
  },
];

/**
 * 鈴木's 上期 sheet, submitted by 佐藤 and waiting on 田中.
 *
 * Without a sheet in this state the 承認待ち screen is permanently empty, and
 * the two-step approval — the part of the scheme that most needs explaining —
 * cannot be seen at all.
 */
const SUZUKI_H1_GOALS: typeof H1_GOALS = [
  {
    category: "quantitative",
    title: "若手2名の施工図作成を指導し、独力で仕上げられる状態にする",
    selfComment: "週1回のレビューを継続し、2名とも簡易な図面は独力で作成できるようになりました。",
    selfScore: 4,
    managerComment: "指導の仕組み化まで進めてくれました。次は難易度の高い図面へ。",
    managerScore: 4,
  },
  {
    category: "quantitative",
    title: "現場Bの安全パトロール指摘件数を前期比で半減させる",
    selfComment: "指摘は前期24件から15件に減少。半減には届きませんでした。",
    selfScore: 3,
    managerComment: "改善傾向は明確です。残る指摘の傾向分析を次期の目標に。",
    managerScore: 3,
  },
];

const SUZUKI_DEV_GOALS: typeof H1_GOALS = [
  {
    category: "development",
    title: "1級土木施工管理技士の一次検定に合格する",
    selfComment: "6月の一次検定に合格しました。二次は下期に受験します。",
    selfScore: 5,
    managerComment: "計画的に学習を進め、一発合格しました。",
    managerScore: 5,
  },
];

/**
 * The five company-wide guidelines as graded goals.
 *
 * Only the self/manager comments live here -- the grade-specific 期待行動 text
 * is looked up from EXPECTED_BEHAVIOR when the sheet is laid down, the same way
 * the app copies it out of behavior_guidelines at 期首.
 */
function behavioralGoalsFor(): typeof H1_GOALS {
  const selfComments = [
    "協力業者との定例を設け、認識のずれを早めに潰すようにしました。",
    "現場から出た改善案を月次でまとめ、課内に共有しています。",
    "1級の学科に合格し、後輩への説明にも使えるようになりました。",
    "指示待ちにならないよう、着工前に課題を洗い出して提案しています。",
    "できない約束はせず、遅れそうな時は早めに相談するようにしています。",
  ];
  const managerComments = [
    "現場の空気が良くなりました。",
    "提案が具体的で助かっています。",
    "学んだことを周りに還元できています。",
    "先回りの動きが増えました。",
    "報告が早く、安心して任せられます。",
  ];
  const selfScores = [4, 4, 5, 4, 4];
  const managerScores = [4, 3, 5, 4, 4];

  return selfComments.map((selfComment, i) => ({
    category: "behavioral" as const,
    title: GUIDELINE_TITLES[i],
    selfComment,
    selfScore: selfScores[i],
    managerComment: managerComments[i],
    managerScore: managerScores[i],
  }));
}

/** Category order on the sheet, matching 人事評価規程 第5条. */
const CATEGORY_ORDER: Record<string, number> = {
  quantitative: 0,
  behavioral: 1,
  development: 2,
};

/** Two weeks of 山田's reports, so the dashboard and AI screens have content. */
const DAILY: { date: string; content: string; hours: number; issues: string; plan: string }[] = [
  {
    date: "2026-08-03",
    content: "現場A基礎工事の配筋検査に立ち会い、施工図との照合を実施。",
    hours: 8,
    issues: "図面の寸法表記に不明点があり、設計へ確認を依頼した。",
    plan: "型枠の建て込み準備と資材数量の確認。",
  },
  {
    date: "2026-08-04",
    content: "型枠設置の段取りを協力会社と打ち合わせ。安全ミーティングを実施。",
    hours: 8.5,
    issues: "特になし。",
    plan: "型枠設置の着手。",
  },
  {
    date: "2026-08-05",
    content: "安全パトロールと週次の資材棚卸しを実施。ヒヤリハット1件を記録・共有。",
    hours: 8,
    issues: "開口部の養生が不十分な箇所を発見し、その場で是正した。",
    plan: "是正箇所の再確認と、型枠精度のチェック。",
  },
  {
    date: "2026-08-06",
    content: "現場A基礎工事の型枠設置。資材搬入の立ち会いを実施。",
    hours: 8,
    issues: "資材搬入が30分遅延。翌日の搬入スケジュールを確認する必要あり。",
    plan: "型枠の最終確認とコンクリート打設準備。",
  },
  {
    date: "2026-07-27",
    content: "施工図の修正対応と、協力会社への工程共有。",
    hours: 7.5,
    issues: "工程表の更新が遅れ、共有が翌日になった。",
    plan: "工程表を更新して朝礼で共有する。",
  },
  {
    date: "2026-07-29",
    content: "資材の発注数量を精査し、余剰在庫を他現場へ融通する調整を実施。",
    hours: 8,
    issues: "特になし。",
    plan: "発注書の作成。",
  },
];

export function buildSeed(): LocalTables {
  const profiles: LocalTables["profiles"] = [
    {
      id: ID.tanaka,
      email: "tanaka@showa-kensetsu.example.com",
      name: "田中 部長",
      role: "manager",
      job_grade: "bucho",
      department: "工事本部",
      manager_id: null,
      created_at: NOW,
    },
    {
      id: ID.sato,
      email: "sato@showa-kensetsu.example.com",
      name: "佐藤 次郎",
      role: "manager",
      job_grade: "kacho",
      department: "工事第一課",
      manager_id: ID.tanaka,
      created_at: NOW,
    },
    {
      id: ID.yamada,
      email: "yamada@showa-kensetsu.example.com",
      name: "山田 太郎",
      role: "employee",
      job_grade: "ippan",
      department: "工事第一課",
      manager_id: ID.sato,
      created_at: NOW,
    },
    {
      id: ID.suzuki,
      email: "suzuki@showa-kensetsu.example.com",
      name: "鈴木 花子",
      role: "employee",
      job_grade: "shunin",
      department: "工事第一課",
      manager_id: ID.sato,
      created_at: NOW,
    },
    {
      id: ID.admin,
      email: "admin@showa-kensetsu.example.com",
      name: "管理者",
      role: "admin",
      job_grade: "ippan",
      department: "経営企画室",
      manager_id: null,
      created_at: NOW,
    },
  ];

  const evaluation_criteria: LocalTables["evaluation_criteria"] = [
    ["safety", "安全管理", "現場での安全確認・KY活動・ヒヤリハット報告など、安全に関する意識と行動", "施工", 1.2, 10],
    ["quality", "品質管理", "図面・仕様への準拠、施工品質、手戻りの少なさ", "施工", 1.2, 20],
    ["schedule", "工程管理", "工程遅延の有無、進捗報告の的確さ、段取りの良さ", "施工", 1.0, 30],
    ["cost_awareness", "コスト意識", "資材・人員配置・手待ちなど、コストを意識した動きができているか", "施工", 0.8, 40],
    ["teamwork", "チームワーク・協調性", "協力会社・他職種との連携、報連相の質", "対人", 1.0, 50],
    ["initiative", "主体性・改善提案", "指示待ちでなく課題を見つけて動けているか、改善提案の有無", "対人", 1.0, 60],
    ["growth", "成長・自己研鑽", "新しい技術や資格取得への取り組み、振り返りの質", "成長", 0.8, 70],
  ].map(([key, label, description, category, weight, sort_order]) => ({
    id: `criterion-${key}`,
    key: key as string,
    label: label as string,
    description: description as string,
    category: category as string,
    weight: weight as number,
    sort_order: sort_order as number,
    is_active: true,
    created_at: NOW,
  }));

  const daily_reports: LocalTables["daily_reports"] = DAILY.map((entry) => ({
    id: `daily-${entry.date}`,
    user_id: ID.yamada,
    report_date: entry.date,
    work_content: entry.content,
    work_hours: entry.hours,
    issues: entry.issues,
    tomorrow_plan: entry.plan,
    created_at: `${entry.date}T09:00:00.000Z`,
    updated_at: `${entry.date}T09:00:00.000Z`,
  }));

  const weekly_reports: LocalTables["weekly_reports"] = [
    {
      id: "weekly-2026-07-27",
      user_id: ID.yamada,
      week_start: "2026-07-27",
      week_end: "2026-08-02",
      self_reflection:
        "工程表の更新が後手に回った週でした。翌週は朝礼前に更新を済ませる運用に変えます。資材の余剰を他現場へ回す調整はうまく進みました。",
      submitted_at: "2026-08-02T10:00:00.000Z",
      created_at: "2026-07-27T09:00:00.000Z",
      updated_at: "2026-08-02T10:00:00.000Z",
    },
  ];

  const term_evaluations: LocalTables["term_evaluations"] = [
    {
      id: ID.termYamadaH1,
      user_id: ID.yamada,
      period_id: ID.periodH1,
      stage: "final",
      status: "approved",
      job_grade: "ippan",
      overall_self_comment:
        "期首に立てた目標のうち、動画研修教材と採用パンフレットは進められました。更新マニュアルは外部要因で遅れています。",
      overall_manager_comment:
        "【よかった点】動画制作の運用体制を自ら構築し、期末までの見通しを立てられた点を評価します。【さらに成長するためのポイント】数値目標の未達については、早い段階で相談してもらえるとより良い結果につながります。",
      submitted_for_approval_at: "2026-07-03T02:00:00.000Z",
      approver_id: ID.tanaka,
      approved_at: "2026-07-04T01:00:00.000Z",
      // Deliberately NOT disclosed: the point of the demo is that 山田 cannot
      // see the manager's marks until 佐藤 presses 公開 after the meeting.
      disclosed_at: null,
      final_snapshot: null,
      created_at: "2026-01-05T00:00:00.000Z",
      updated_at: "2026-07-04T01:00:00.000Z",
    },
    {
      id: ID.termSuzukiH1,
      user_id: ID.suzuki,
      period_id: ID.periodH1,
      stage: "final",
      // 佐藤 has graded and submitted; 田中 has not signed off yet. This is what
      // populates the 承認待ち screen.
      status: "pending_approval",
      job_grade: "shunin",
      overall_self_comment:
        "若手指導は形になってきました。安全指摘の半減は未達で、原因の切り分けが次期の課題です。",
      overall_manager_comment:
        "【よかった点】指導を仕組みにまで落とし込めた点。【さらに成長するためのポイント】数値目標は途中経過の共有をもう一段細かく。",
      submitted_for_approval_at: "2026-07-06T01:30:00.000Z",
      approver_id: null,
      approved_at: null,
      disclosed_at: null,
      final_snapshot: null,
      created_at: "2026-01-05T00:00:00.000Z",
      updated_at: "2026-07-06T01:30:00.000Z",
    },
  ];

  const term_evaluation_items: LocalTables["term_evaluation_items"] = [];
  const term_evaluation_marks: LocalTables["term_evaluation_marks"] = [];

  /** Lay one person's sheet down: goals, the five guidelines, and the marks. */
  function addSheet(
    evaluationId: string,
    grade: JobGrade,
    goals: typeof H1_GOALS,
    prefix: string
  ) {
    const perCategoryOrder: Record<string, number> = {};
    // The behavioral five are company-wide, so they are appended to whatever
    // free-text goals the person wrote -- the same thing createTermEvaluation
    // does at 期首.
    const all = [
      ...goals.filter((g) => g.category !== "behavioral"),
      ...goals.filter((g) => g.category === "behavioral"),
    ].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);

    all.forEach((goal, index) => {
      const sortOrder = (perCategoryOrder[goal.category] =
        (perCategoryOrder[goal.category] ?? 0) + 1);
      const itemId = `${prefix}-${index + 1}`;
      term_evaluation_items.push({
        id: itemId,
        term_evaluation_id: evaluationId,
        category: goal.category,
        sort_order: sortOrder,
        title: goal.title,
        expected_behavior:
          goal.category === "behavioral" ? EXPECTED_BEHAVIOR[grade][sortOrder - 1] : null,
        midterm_progress: null,
        midterm_self_score: null,
        self_comment: goal.selfComment,
        self_score: goal.selfScore,
        created_at: "2026-01-05T00:00:00.000Z",
        updated_at: "2026-06-30T00:00:00.000Z",
      });
      term_evaluation_marks.push({
        item_id: itemId,
        term_evaluation_id: evaluationId,
        manager_comment: goal.managerComment,
        manager_score: goal.managerScore,
        final_score: goal.managerScore,
        created_at: "2026-07-03T00:00:00.000Z",
        updated_at: "2026-07-03T00:00:00.000Z",
      });
    });
  }

  addSheet(ID.termYamadaH1, "ippan", H1_GOALS, "term-item");
  addSheet(
    ID.termSuzukiH1,
    "shunin",
    [...SUZUKI_H1_GOALS, ...behavioralGoalsFor(), ...SUZUKI_DEV_GOALS],
    "term-suzuki"
  );

  return {
    profiles,
    daily_reports,
    weekly_reports,
    evaluation_criteria,
    weekly_ai_evaluations: [],
    evaluation_periods: [
      {
        id: ID.periodH1,
        year: 2026,
        half: "H1",
        starts_on: "2026-01-01",
        ends_on: "2026-06-30",
        status: "closed",
        created_at: NOW,
      },
      {
        id: ID.periodH2,
        year: 2026,
        half: "H2",
        starts_on: "2026-07-01",
        ends_on: "2026-12-31",
        status: "open",
        created_at: NOW,
      },
    ],
    job_grade_weights: WEIGHTS,
    behavior_guidelines: behaviorGuidelines(),
    term_evaluations,
    term_evaluation_items,
    term_evaluation_marks,
  };
}

/** Shown on the login screen so the roles can be switched while demoing. */
export const DEMO_ACCOUNTS = [
  { email: "yamada@showa-kensetsu.example.com", name: "山田 太郎", note: "一般職・本人" },
  { email: "sato@showa-kensetsu.example.com", name: "佐藤 次郎", note: "課長・山田の上長" },
  { email: "tanaka@showa-kensetsu.example.com", name: "田中 部長", note: "部長・二次承認者" },
  { email: "admin@showa-kensetsu.example.com", name: "管理者", note: "管理画面" },
];
