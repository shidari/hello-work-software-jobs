// Low-quality sweep tests for JobDetailTransformer.transform — exercises
// the HTML → domain model pipeline with linkedom via a synthetic HTML doc.

import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";

import { JobDetailTransformer } from "../hellowork/job-detail-crawler/transformer";

// Minimal HTML with all required fields for RawJobToDomainJob to succeed.
// Dates/wages/working-hours picked so every transform branch has valid input.
const sampleHtml = `<!doctype html><html><body>
  <span id="ID_kjNo">13080-55925651</span>
  <span id="ID_jgshMei">Acme</span>
  <span id="ID_uktkYmd">2025年1月1日</span>
  <span id="ID_shkiKigenHi">2025年12月31日</span>
  <span id="ID_hp">example.com</span>
  <span id="ID_sksu">engineer</span>
  <span id="ID_koyoKeitai">正社員</span>
  <span id="ID_chgn">200,000円〜300,000円</span>
  <span id="ID_shgJn1">9時0分〜18時0分</span>
  <span id="ID_jgisKigyoZentai">10名</span>
  <span id="ID_shgBsJusho">tokyo</span>
  <span id="ID_shigotoNy">build stuff</span>
  <span id="ID_hynaMenkyoSkku">none</span>
  <span id="ID_jgshNo">0101-626495-7</span>
  <span id="ID_onlinJishuOboUktkKahi">可</span>
</body></html>`;

describe("coverage sweep: JobDetailTransformer.transform", () => {
  it("transforms a full sample HTML into a TransformedJob + company", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* JobDetailTransformer;
        return yield* t.transform(sampleHtml);
      }).pipe(Effect.provide(JobDetailTransformer.Default), Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.job.jobNumber).toBe("13080-55925651");
    }
  });

  it("fails on missing required fields", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* JobDetailTransformer;
        return yield* t.transform("<html><body></body></html>");
      }).pipe(Effect.provide(JobDetailTransformer.Default), Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("JobDetailTransformError");
    }
  });

  it("warns-and-drops company when company parse fails (missing establishmentNumber)", async () => {
    // Required job fields but no ID_jgshNo (establishmentNumber) so
    // the company branch is skipped entirely — covers the `company = null` path.
    const html = sampleHtml.replace(/<span id="ID_jgshNo">[^<]*<\/span>/, "");
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const t = yield* JobDetailTransformer;
        return yield* t.transform(html);
      }).pipe(Effect.provide(JobDetailTransformer.Default), Effect.either),
    );
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.company).toBeNull();
    }
  });
});
