import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
  extractRawCompanyFromDocument,
  extractRawFieldsFromDocument,
} from "../extractor";

const buildJobDetailHtml = (overrides: Record<string, string>) => {
  const ids = [
    "ID_kjNo",
    "ID_jgshMei",
    "ID_uktkYmd",
    "ID_shkiKigenHi",
    "ID_hp",
    "ID_sksu",
    "ID_koyoKeitai",
    "ID_chgn",
    "ID_shgJn1",
    "ID_jgisKigyoZentai",
    "ID_shgBsJusho",
    "ID_shigotoNy",
    "ID_hynaMenkyoSkku",
    "ID_jgshNo",
    "ID_kjKbn",
    "ID_sngBrui",
    "ID_juriAtsh",
    "ID_onlinJishuOboUktkKahi",
    "ID_hakenUkeoiToShgKeitai",
    "ID_koyoKikan",
    "ID_nenreiSegn",
    "ID_grki",
    "ID_hynaKiknt",
    "ID_trialKikan",
    "ID_mycarTskn",
    "ID_tenkinNoKnsi",
    "ID_chgnKeitaiToKbn",
    "ID_shokyuSd",
    "ID_shoyoSdNoUmu",
    "ID_knyHoken",
    "ID_tskinSd",
    "ID_szciYbn",
    "ID_szci",
    "ID_setsuritsuNen",
    "ID_shkn",
    "ID_jigyoNy",
    "ID_hoNinNo",
  ];
  const cells = ids
    .map((id) => `<td id="${id}">${overrides[id] ?? ""}</td>`)
    .join("");
  return `<!doctype html><html><body><table>${cells}</table></body></html>`;
};

describe("extractRawFieldsFromDocument", () => {
  it("ID_* セレクタから RawJob フィールドを抽出する", () => {
    const html = buildJobDetailHtml({
      ID_kjNo: "13010-12345678",
      ID_jgshMei: "株式会社テスト",
      ID_uktkYmd: "2026年5月1日",
      ID_shkiKigenHi: "2026年7月31日",
      ID_sksu: "ソフトウェア開発技術者",
      ID_koyoKeitai: "正社員",
      ID_chgn: "300,000円〜500,000円",
      ID_shgJn1: "9時00分〜18時00分",
      ID_jgisKigyoZentai: "100人",
      ID_shgBsJusho: "東京都渋谷区",
      ID_shigotoNy: "Webアプリ開発",
      ID_jgshNo: "0101-626495-7",
      ID_kjKbn: "フルタイム",
      ID_chgnKeitaiToKbn: "月給",
    });
    const { document } = parseHTML(html);
    const raw = extractRawFieldsFromDocument(document as unknown as Document);
    expect(raw.jobNumber).toBe("13010-12345678");
    expect(raw.companyName).toBe("株式会社テスト");
    expect(raw.receivedDate).toBe("2026年5月1日");
    expect(raw.expiryDate).toBe("2026年7月31日");
    expect(raw.occupation).toBe("ソフトウェア開発技術者");
    expect(raw.employmentType).toBe("正社員");
    expect(raw.wage).toBe("300,000円〜500,000円");
    expect(raw.workingHours).toBe("9時00分〜18時00分");
    expect(raw.employeeCount).toBe("100人");
    expect(raw.workPlace).toBe("東京都渋谷区");
    expect(raw.jobDescription).toBe("Webアプリ開発");
    expect(raw.establishmentNumber).toBe("0101-626495-7");
    expect(raw.jobCategory).toBe("フルタイム");
    expect(raw.wageType).toBe("月給");
  });

  it("空文字列のセレクタは null になる", () => {
    const { document } = parseHTML(buildJobDetailHtml({}));
    const raw = extractRawFieldsFromDocument(document as unknown as Document);
    expect(raw.jobNumber).toBeNull();
    expect(raw.companyName).toBeNull();
    expect(raw.wage).toBeNull();
    expect(raw.workingHours).toBeNull();
  });

  it("セレクタ不在時もすべてのキーは存在し null", () => {
    const { document } = parseHTML("<!doctype html><html><body></body></html>");
    const raw = extractRawFieldsFromDocument(document as unknown as Document);
    expect(raw.jobNumber).toBeNull();
    expect(raw.bonus).toBeNull();
    expect(raw.retirementBenefit).toBeNull();
  });

  it("textContent の前後空白はトリムされる", () => {
    const html = `<!doctype html><html><body><span id="ID_kjNo">  13010-12345678  \n</span></body></html>`;
    const { document } = parseHTML(html);
    const raw = extractRawFieldsFromDocument(document as unknown as Document);
    expect(raw.jobNumber).toBe("13010-12345678");
  });
});

describe("extractRawCompanyFromDocument", () => {
  it("ID_* セレクタから RawCompany を抽出する", () => {
    const html = buildJobDetailHtml({
      ID_jgshNo: "0101-626495-7",
      ID_jgshMei: "株式会社テスト",
      ID_szciYbn: "150-0001",
      ID_szci: "東京都渋谷区神宮前1-2-3",
      ID_jgisKigyoZentai: "120人",
      ID_setsuritsuNen: "2001",
      ID_shkn: "1000万円",
      ID_jigyoNy: "Webアプリ開発・運用",
      ID_hoNinNo: "9430001008073",
    });
    const { document } = parseHTML(html);
    const raw = extractRawCompanyFromDocument(document as unknown as Document);
    expect(raw.establishmentNumber).toBe("0101-626495-7");
    expect(raw.companyName).toBe("株式会社テスト");
    expect(raw.postalCode).toBe("150-0001");
    expect(raw.address).toBe("東京都渋谷区神宮前1-2-3");
    expect(raw.employeeCount).toBe("120人");
    expect(raw.foundedYear).toBe("2001");
    expect(raw.capital).toBe("1000万円");
    expect(raw.businessDescription).toBe("Webアプリ開発・運用");
    expect(raw.corporateNumber).toBe("9430001008073");
  });
});
