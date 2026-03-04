import { Arbitrary, FastCheck, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { DbJobSchema } from ".";

describe("DbJobSchema", () => {
  const arb = Arbitrary.make(DbJobSchema);

  it("encode → decode → encode は冪等である", () => {
    FastCheck.assert(
      FastCheck.property(arb, (job) => {
        const encoded = Schema.encodeSync(DbJobSchema)(job);
        const decoded = Schema.decodeSync(DbJobSchema)(encoded);
        const reEncoded = Schema.encodeSync(DbJobSchema)(decoded);
        expect(reEncoded).toEqual(encoded);
      }),
    );
  });
});
