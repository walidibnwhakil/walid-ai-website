// Writer verification uses independently reported, concrete literary works.
// A missing record means unknown, not "no".
// Humayun Ahmed: Dhaka Tribune, 2026 (Himu/Misir Ali/Nondito Noroke)
// https://www.dhakatribune.com/bangladesh/424522/humayun-ahmed-s-78th-birth-anniversary-being
// Muhammed Zafar Iqbal: Islam Museum biography, books Dipu Number Two and
// Amar Bondhu Rashed (both original named literary works).
// https://www.islam.museum/en/person/muhammed-zafar-iqbal/
export const WRITER_PROOF_QUESTIONS = Object.freeze([
  { id: "writer_himu", group: "writer_proof",
    en: "Did they create the fictional character Himu?",
    bn: "তিনি কি হিমু চরিত্রটি সৃষ্টি করেছেন?" },
  { id: "writer_misir_ali", group: "writer_proof",
    en: "Did they create the fictional character মিসির আলি (Misir Ali)?",
    bn: "তিনি কি মিসির আলি চরিত্রটি সৃষ্টি করেছেন?" },
  { id: "writer_nondito_noroke", group: "writer_proof",
    en: "Did they write the novel Nondito Noroke?",
    bn: "তিনি কি 'নন্দিত নরকে' উপন্যাসটি লিখেছেন?" },
  { id: "writer_dipu_number_two", group: "writer_proof",
    en: "Did they write Dipu Number Two?",
    bn: "তিনি কি 'দীপু নাম্বার টু' লিখেছেন?" },
  { id: "writer_amar_bondhu_rashed", group: "writer_proof",
    en: "Did they write Amar Bondhu Rashed?",
    bn: "তিনি কি 'আমার বন্ধু রাশেদ' লিখেছেন?" },
]);

export const WRITER_PROOFS = Object.freeze({
  Q12052777: Object.freeze([
    "writer_himu", "writer_misir_ali", "writer_nondito_noroke",
  ]),
  Q285203: Object.freeze([
    "writer_dipu_number_two", "writer_amar_bondhu_rashed",
  ]),
});

export const WRITER_PROOF_IDS = new Set(WRITER_PROOF_QUESTIONS.map((row) => row.id));
export const WRITER_PROOF_FACTS = Object.freeze(Object.fromEntries(
  Object.entries(WRITER_PROOFS).map(([personId, qs]) => [
    personId, Object.freeze(Object.fromEntries(qs.map((id) => [id, 2]))),
  ]),
));
