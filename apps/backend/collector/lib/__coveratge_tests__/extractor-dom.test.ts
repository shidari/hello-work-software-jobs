// Low-quality sweep tests for job-detail-crawler/extractor DOM functions.

import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

import {
  extractRawCompanyFromDocument,
  extractRawFieldsFromDocument,
} from "../hellowork/job-detail-crawler/extractor";

const idsJob = [
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
];

const idsCompany = [
  "ID_jgshNo",
  "ID_jgshMei",
  "ID_szciYbn",
  "ID_szci",
  "ID_jgisKigyoZentai",
  "ID_setsuritsuNen",
  "ID_shkn",
  "ID_jigyoNy",
  "ID_hoNinNo",
];

const buildDocument = (ids: readonly string[], withText: boolean) => {
  const spans = ids
    .map((id) => `<span id="${id}">${withText ? `value-${id}` : ""}</span>`)
    .join("");
  const { document } = parseHTML(
    `<!doctype html><html><body>${spans}</body></html>`,
  );
  return document as unknown as Document;
};

describe("coverage sweep: extractRawFieldsFromDocument", () => {
  it("returns values when elements contain text", () => {
    const doc = buildDocument(idsJob, true);
    const raw = extractRawFieldsFromDocument(doc);
    expect(raw.jobNumber).toBe("value-ID_kjNo");
    expect(raw.companyName).toBe("value-ID_jgshMei");
    expect(raw.retirementBenefit).toBe("value-ID_tskinSd");
  });

  it("returns nulls when document is empty", () => {
    const { document } = parseHTML("<!doctype html><html><body></body></html>");
    const raw = extractRawFieldsFromDocument(document as unknown as Document);
    for (const v of Object.values(raw)) expect(v).toBeNull();
  });

  it("returns nulls when elements exist with empty text", () => {
    const doc = buildDocument(idsJob, false);
    const raw = extractRawFieldsFromDocument(doc);
    for (const v of Object.values(raw)) expect(v).toBeNull();
  });
});

describe("coverage sweep: extractRawCompanyFromDocument", () => {
  it("returns values when elements contain text", () => {
    const doc = buildDocument(idsCompany, true);
    const raw = extractRawCompanyFromDocument(doc);
    expect(raw.establishmentNumber).toBe("value-ID_jgshNo");
    expect(raw.companyName).toBe("value-ID_jgshMei");
  });

  it("returns nulls when document is empty", () => {
    const { document } = parseHTML("<!doctype html><html><body></body></html>");
    const raw = extractRawCompanyFromDocument(document as unknown as Document);
    for (const v of Object.values(raw)) expect(v).toBeNull();
  });
});
