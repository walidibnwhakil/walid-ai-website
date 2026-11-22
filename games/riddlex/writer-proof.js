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
    en: "Did they create the fictional character Misir Ali?",
    bn: "তিনি কি মিসির আলি চরিত্রটি সৃষ্টি করেছেন?" },
  { id: "writer_nondito_noroke", group: "writer_proof",
    en: "Did they write the novel Nondito Noroke?",
    bn: "তিনি কি 'নন্দিত নরকে' উপন্যাসটি লিখেছেন?" },
  { id: "writer_shonkhonil_karagar", group: "writer_proof",
    en: "Did they write Shonkhonil Karagar?",
    bn: "তিনি কি 'শঙ্খনীল কারাগার' লিখেছেন?" },
  { id: "writer_dipu_number_two", group: "writer_proof",
    en: "Did they write Dipu Number Two?",
    bn: "তিনি কি 'দীপু নাম্বার টু' লিখেছেন?" },
  { id: "writer_amar_bondhu_rashed", group: "writer_proof",
    en: "Did they write Amar Bondhu Rashed?",
    bn: "তিনি কি 'আমার বন্ধু রাশেদ' লিখেছেন?" },
  { id: "writer_project_nebula", group: "writer_proof",
    en: "Did they write the science-fiction book Project Nebula?",
    bn: "তিনি কি 'প্রজেক্ট নেবুলা' কল্পবিজ্ঞান বইটি লিখেছেন?" },
]);

export const WRITER_PROOFS = Object.freeze({
  Q12052777: Object.freeze([
    "writer_himu", "writer_misir_ali", "writer_nondito_noroke", "writer_shonkhonil_karagar",
  ]),
  Q285203: Object.freeze([
    "writer_dipu_number_two", "writer_amar_bondhu_rashed", "writer_project_nebula",
  ]),
});

export const WRITER_PROOF_IDS = new Set(WRITER_PROOF_QUESTIONS.map((row) => row.id));
export const WRITER_PROOF_FACTS = Object.freeze(Object.fromEntries(
  Object.entries(WRITER_PROOFS).map(([personId, qs]) => [
    personId, Object.freeze(Object.fromEntries(qs.map((id) => [id, 2]))),
  ]),
));
