// Relative, with the extension: this module is exercised by `node --test`
// under --experimental-strip-types, which resolves imports as plain ESM and
// knows nothing about the `@/` alias.
import { formatDate, parseDate } from "../date/week.ts";

/**
 * 「その人がその日働いていたか」を答えるための層。
 *
 * これまでシステムにはこの概念が無かった。日報の分母は月〜金を数えるだけの
 * 関数で、祝日も年末年始も有給も知らなかった。結果として、有給を取った人が
 * 「日報が3/5件しかない、記録が途切れている」と評価されていた。実際には
 * 提出義務のない日だったのに。
 *
 * ソースを差し替えられる形にしてあるのは、勤怠の正解がどこにあるかが会社に
 * よって違うから。いまは会社休日テーブル＋個人の休暇テーブルを見るが、
 * ジョブカン勤怠を繋いだあとは `personal_leaves` の同期先がジョブカンになる。
 * 呼び出し側（ダッシュボード・AI評価器・プロンプト）はこの関数だけを見ていれば
 * よく、勤怠の出どころが変わっても書き換えなくて済む。
 */
export interface WorkingDaySource {
  /** from〜to（両端含む）のうち、その人が稼働する日を YYYY-MM-DD で返す。 */
  listWorkingDays(userId: string, from: string, to: string): Promise<string[]>;
}

/** 土日を除いたカレンダー上の全日。休日マスタを引く前の土台。 */
export function weekdaysBetween(from: string, to: string): string[] {
  const start = parseDate(from);
  const end = parseDate(to);
  if (end < start) return [];

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * 既定のソース。平日から会社休日（祝日・年末年始・創立記念日など）と、
 * その人の休暇（有給・欠勤・特別休暇）を引く。
 *
 * 会社休日テーブルが空でも壊れないのが大事な点で、その場合は
 * これまでどおり平日をそのまま数えるだけに退化する。導入直後に休日マスタが
 * 未登録でも、評価が止まったり誤ったりはしない。
 */
export class CalendarWorkingDaySource implements WorkingDaySource {
  private readonly client: {
    from: (table: string) => {
      select: (columns: string) => {
        gte: (
          column: string,
          value: string
        ) => {
          lte: (column: string, value: string) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
      };
    };
  };

  constructor(client: CalendarWorkingDaySource["client"]) {
    this.client = client;
  }

  async listWorkingDays(userId: string, from: string, to: string): Promise<string[]> {
    const [holidays, leaves] = await Promise.all([
      this.client.from("company_holidays").select("holiday_on").gte("holiday_on", from).lte("holiday_on", to),
      this.client.from("personal_leaves").select("user_id, leave_on").gte("leave_on", from).lte("leave_on", to),
    ]);

    const closed = new Set<string>(
      (holidays.data ?? []).map((row) => String(row.holiday_on))
    );
    for (const row of leaves.data ?? []) {
      if (String(row.user_id) === userId) closed.add(String(row.leave_on));
    }

    return weekdaysBetween(from, to).filter((day) => !closed.has(day));
  }
}

/**
 * ジョブカン勤怠から稼働日を取るソース — **未実装**。
 *
 * ジョブカン勤怠APIの実仕様（エンドポイント・認証方式・どのプランで使えるか）を
 * この環境から確認できていない（ヘルプセンターがプロキシに遮断されている）。
 * 記憶で書けば嘘になるので、契約プランとAPIトークンを確認してから実装する。
 * 必要な情報は README の「ジョブカン連携」に列挙してある。
 *
 * 実装するのはこの1メソッドだけでよい。呼び出し側は WorkingDaySource しか
 * 見ていないので、ここが埋まれば勤怠の正解がジョブカンに移る。
 */
export class JobcanWorkingDaySource implements WorkingDaySource {
  async listWorkingDays(): Promise<string[]> {
    throw new Error(
      "ジョブカン連携は未設定です。ATTENDANCE_SOURCE=jobcan を使うには、" +
        "ジョブカン勤怠APIの仕様確認とトークン設定が必要です（README参照）。"
    );
  }
}

/**
 * 稼働日数だけが欲しい呼び出し側のための入り口。
 *
 * `end` を渡すと期間をそこで切る。ダッシュボードの「今週の日報 n/m件」は
 * 週末までの日数ではなく今日までの日数を分母にしたいので、週の途中では
 * 今日を渡す（まだ来ていない金曜日の日報が「未提出」に数えられないように）。
 */
export async function countWorkingDays(userId: string, from: string, to: string): Promise<number> {
  const source = await resolveSource();
  if (!source) return weekdaysBetween(from, to).length;
  const days = await source.listWorkingDays(userId, from, to);
  return days.length;
}

/**
 * その日が休みなら理由を返す。稼働日なら null。
 *
 * 日報画面が「本日は休日です。提出は不要です」と出すために使う。理由まで返すのは、
 * ただ「提出不要」とだけ出すと自分が休みに設定されていることに気づけず、
 * 勤怠側の登録ミスを見逃すため。
 */
export async function getDayOff(
  userId: string,
  date: string
): Promise<{ label: string } | null> {
  const weekday = parseDate(date).getDay();
  if (weekday === 0 || weekday === 6) return { label: "休日" };

  const source = await resolveSource();
  if (!source) return null;

  const working = await source.listWorkingDays(userId, date, date);
  if (working.length > 0) return null;
  return { label: await labelFor(date) };
}

/** 休みの名前。会社休日ならその名前、そうでなければ個人の休暇。 */
async function labelFor(date: string): Promise<string> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient()
    .from("company_holidays")
    .select("label")
    .eq("holiday_on", date)
    .maybeSingle();
  return data?.label || "休暇";
}

/**
 * どのソースを使うかは環境変数で決まる。既定はカレンダー（会社休日＋休暇テーブル）。
 * `mode.ts` と同じ考え方で、設定が無ければ動くほうに倒す。
 */
async function resolveSource(): Promise<WorkingDaySource | null> {
  if (process.env.ATTENDANCE_SOURCE === "jobcan") {
    return new JobcanWorkingDaySource();
  }
  // Import lazily: this module is imported from a client-facing path in tests,
  // and `admin.ts` pulls in `server-only`.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return new CalendarWorkingDaySource(
    createAdminClient() as unknown as CalendarWorkingDaySource["client"]
  );
}
