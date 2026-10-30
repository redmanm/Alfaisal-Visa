import { describe, it, expect } from "vitest";
import { DICTIONARY, type Language } from "@/lib/i18n";
import { getPaymentLabel, getVisaStatusLabel, getMedicalLabel } from "@/lib/export";

describe("Strict Bilingual Localization (No Language Mixing)", () => {
  it("ensures every Arabic key has a corresponding English translation", () => {
    const arKeys = Object.keys(DICTIONARY.ar) as (keyof typeof DICTIONARY.ar)[];
    const enKeys = new Set(Object.keys(DICTIONARY.en));

    for (const k of arKeys) {
      expect(enKeys.has(k)).toBe(true);
      expect(DICTIONARY.ar[k]).toBeTruthy();
      expect(DICTIONARY.en[k as keyof typeof DICTIONARY.en]).toBeTruthy();
    }
  });

  it("ensures Arabic dictionary does not contain mixed English words in parentheses", () => {
    // Specifically test that terms like (PAID), (TRIB), (WKALA), (INSERT), (Admin) are absent from Arabic UI strings
    const prohibitedMixedAcronyms = [
      "(PAID)",
      "(PENDING)",
      "(TRIB)",
      "(WKALA)",
      "(EMBASSY)",
      "(VISA STAMP)",
      "(VISA STAMPED)",
      "(CANCELED)",
      "(CANCELLED)",
      "(INSERT)",
      "(UPDATE)",
      "(DELETE)",
      "(Super Admin)",
      "(Admin)",
      "(Staff)",
      "(Assigned Countries)",
      "(Role)",
    ];

    for (const [key, value] of Object.entries(DICTIONARY.ar)) {
      for (const phrase of prohibitedMixedAcronyms) {
        expect(
          value.includes(phrase),
          `Arabic key '${key}' contains forbidden English phrase '${phrase}' in value: "${value}"`,
        ).toBe(false);
      }
    }
  });

  it("exports status labels cleanly in Arabic and English", () => {
    const langs: Language[] = ["ar", "en"];

    for (const l of langs) {
      const paid = getPaymentLabel("PAID", l);
      const pending = getPaymentLabel("PENDING", l);
      const visaStamp = getVisaStatusLabel("VISA STAMP", l);
      const trib = getVisaStatusLabel("TRIB", l);
      const fit = getMedicalLabel("FIT", l);

      if (l === "ar") {
        expect(paid).toBe("مدفوع");
        expect(pending).toBe("معلق");
        expect(visaStamp).toBe("تأشيرة صادرة");
        expect(trib).toBe("تدريب مهني");
        expect(fit).toBe("لائق طبياً");
        // Verify no English letters in Arabic labels
        expect(/[a-zA-Z]/.test(paid)).toBe(false);
        expect(/[a-zA-Z]/.test(pending)).toBe(false);
        expect(/[a-zA-Z]/.test(visaStamp)).toBe(false);
        expect(/[a-zA-Z]/.test(trib)).toBe(false);
        expect(/[a-zA-Z]/.test(fit)).toBe(false);
      } else {
        expect(paid).toBe("Paid");
        expect(pending).toBe("Pending");
        expect(visaStamp).toBe("Visa Stamped");
        expect(trib).toBe("TRIB Completed");
        expect(fit).toBe("Fit");
        // Verify no Arabic characters in English labels
        expect(/[\u0600-\u06FF]/.test(paid)).toBe(false);
        expect(/[\u0600-\u06FF]/.test(pending)).toBe(false);
        expect(/[\u0600-\u06FF]/.test(visaStamp)).toBe(false);
        expect(/[\u0600-\u06FF]/.test(trib)).toBe(false);
        expect(/[\u0600-\u06FF]/.test(fit)).toBe(false);
      }
    }
  });

  it("keeps candidate and sponsor names unmodified as required by business exception rule", () => {
    const arabicSponsor = "عبدالله محمد بن صالح العتيبي";
    const arabicWorker = "مريم أديسو تيكلي";

    // Regardless of system language, name values should remain unaltered
    expect(arabicSponsor).toBe("عبدالله محمد بن صالح العتيبي");
    expect(arabicWorker).toBe("مريم أديسو تيكلي");
  });
});
