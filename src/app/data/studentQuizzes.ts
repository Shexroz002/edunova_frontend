// ─────────────────────────────────────────────────────────────────────────────
// Shared quiz & question data for Student pages
// ─────────────────────────────────────────────────────────────────────────────

export type Difficulty = 'Oson' | "O'rta" | 'Qiyin';

export interface QuizQuestion {
  id: number;
  order: number;
  text: string;
  topic: string;
  difficulty: Difficulty;
  correctPct: number; // % of students who answered correctly
  options?: string[];
  correctIndex?: number;
}

export interface Quiz {
  id: number;
  quiz_id: string;
  title: string;
  subject: string;
  subjectIcon: string;
  subjectColor: string;
  description: string;
  questions: number;
  durationMin: number;
  isNew: boolean;
  difficulty: Difficulty;
  participants: number;
  tags: string[];
  createdDate: string;
  status: string;
}

export const QUIZZES: Quiz[] = [
  {
    id: 1, quiz_id: '#Q-001',
    title: 'Mexanika asoslari — 1',
    subject: 'Fizika', subjectIcon: 'flask', subjectColor: '#38BDF8',
    description: "Nyuton qonunlari, harakat turlari va dinamika asoslarini o'z ichiga olgan test.",
    questions: 35, durationMin: 30, isNew: true,
    difficulty: 'Qiyin', participants: 128,
    tags: ['Nyuton', 'Dinamika', 'Kinematika'],
    createdDate: '12 mart', status: "Qo'lda",
  },
  {
    id: 2, quiz_id: '#Q-002',
    title: 'Algebra asoslari — 2',
    subject: 'Matematika', subjectIcon: 'calculator', subjectColor: '#818CF8',
    description: "Ko'p hadlar, tengsizliklar va kvadrat tenglamalarni yeching.",
    questions: 25, durationMin: 20, isNew: false,
    difficulty: "O'rta", participants: 214,
    tags: ['Algebra', 'Tengsizlik', 'Tenglama'],
    createdDate: '8 mart', status: "Qo'lda",
  },
  {
    id: 3, quiz_id: '#Q-003',
    title: 'Kimyoviy reaksiyalar — 1',
    subject: 'Kimyo', subjectIcon: 'leaf', subjectColor: '#34D399',
    description: "Kimyoviy reaksiyalar turlari, tenglashtirishlar va molyar massa hisoblashlari.",
    questions: 20, durationMin: 15, isNew: true,
    difficulty: 'Oson', participants: 76,
    tags: ['Reaksiya', 'Mol', 'Valent'],
    createdDate: '15 mart', status: "Qo'lda",
  },
  {
    id: 4, quiz_id: '#Q-004',
    title: 'Ingliz tili — Grammar B1',
    subject: 'Ingliz tili', subjectIcon: 'languages', subjectColor: '#FBBF24',
    description: "Present Perfect, Past Simple va Future Continuous zamon shakllarini mustahkamlash.",
    questions: 30, durationMin: 25, isNew: false,
    difficulty: "O'rta", participants: 189,
    tags: ['Grammar', 'Tenses', 'Vocabulary'],
    createdDate: '5 mart', status: "Qo'lda",
  },
  {
    id: 5, quiz_id: '#Q-005',
    title: 'Hujayra tuzilishi va vazifasi',
    subject: 'Biologiya', subjectIcon: 'book', subjectColor: '#A78BFA',
    description: "Hujayra organoidlari, DNK tuzilishi va biologik jarayonlar bo'yicha chuqur bilim.",
    questions: 40, durationMin: 35, isNew: true,
    difficulty: 'Qiyin', participants: 53,
    tags: ['Hujayra', 'DNK', 'Organoid'],
    createdDate: '18 mart', status: "Qo'lda",
  },
  {
    id: 6, quiz_id: '#Q-006',
    title: "O'zbek adabiyoti — Klassiklar",
    subject: "O'zbek tili", subjectIcon: 'globe', subjectColor: '#FB923C',
    description: "Navoiy, Muqimiy va Cho'lpon asarlari bo'yicha adabiy bilimlarni tekshirish.",
    questions: 22, durationMin: 18, isNew: false,
    difficulty: 'Oson', participants: 97,
    tags: ['Navoiy', 'Adabiyot', 'Klassik'],
    createdDate: '2 mart', status: "Qo'lda",
  },
  {
    id: 7, quiz_id: '#Q-007',
    title: 'Geometriya — Stereometriya',
    subject: 'Matematika', subjectIcon: 'calculator', subjectColor: '#818CF8',
    description: "Uch o'lchamli jismlar — kub, silindr, konus va sharlarning xossalari va formulalari.",
    questions: 28, durationMin: 24, isNew: false,
    difficulty: 'Qiyin', participants: 142,
    tags: ['Stereometriya', 'Geometriya', '3D'],
    createdDate: '20 fevral', status: "Qo'lda",
  },
  {
    id: 8, quiz_id: '#Q-008',
    title: 'Optika va Elektr',
    subject: 'Fizika', subjectIcon: 'flask', subjectColor: '#38BDF8',
    description: "Yorug'lik sinishi, linzalar, elektr zanjiri va Ohm qonunlari bo'yicha aralash test.",
    questions: 32, durationMin: 28, isNew: true,
    difficulty: "O'rta", participants: 61,
    tags: ['Optika', 'Elektr', 'Ohm'],
    createdDate: '22 mart', status: "Qo'lda",
  },
];

// ─── Per-quiz question sets (10 questions each shown) ─────────────────────────
export const QUIZ_QUESTIONS: Record<number, QuizQuestion[]> = {
  1: [
    { id: 1,  order: 1,  text: "Nyutonning birinchi qonuni qaysi tushunchani ifodalaydi?",                  topic: 'Dinamika',    difficulty: 'Oson',  correctPct: 87 },
    { id: 2,  order: 2,  text: "F = ma formulasida 'a' nima?",                                             topic: 'Dinamika',    difficulty: 'Oson',  correctPct: 92 },
    { id: 3,  order: 3,  text: "To'pning erkin tushish tezlanishi qancha?",                                 topic: 'Kinematika',  difficulty: 'Oson',  correctPct: 95 },
    { id: 4,  order: 4,  text: "Inertsiya kuchi qaysi holda paydo bo'ladi?",                               topic: 'Dinamika',    difficulty: "O'rta", correctPct: 74 },
    { id: 5,  order: 5,  text: "Siqilgan prujinaning potentsial energiyasini hisoblang (k=200 N/m, x=0.1m)?", topic: 'Energiya',    difficulty: "O'rta", correctPct: 68 },
    { id: 6,  order: 6,  text: "Bir xil massadagi ikkita jism to'qnashganda impuls saqlanishini isbotlang?", topic: 'Dinamika',    difficulty: 'Qiyin', correctPct: 51 },
    { id: 7,  order: 7,  text: "Proektil harakat paytida gorizontal tezlik qanday o'zgaradi?",             topic: 'Kinematika',  difficulty: "O'rta", correctPct: 78 },
    { id: 8,  order: 8,  text: "Aylanma harakat uchun markazga intilma tezlanish formulasi?",              topic: 'Kinematika',  difficulty: 'Qiyin', correctPct: 44 },
    { id: 9,  order: 9,  text: "Nyutonning uchinchi qonuniga misol keltiring?",                            topic: 'Dinamika',    difficulty: 'Oson',  correctPct: 83 },
    { id: 10, order: 10, text: "Qattiq jism statik muvozanatining shartlari nima?",                        topic: 'Statika',     difficulty: 'Qiyin', correctPct: 39 },
  ],
  2: [
    { id: 1,  order: 1,  text: "ax² + bx + c = 0 tenglamaning diskriminantini toping?",                   topic: 'Algebra',      difficulty: 'Oson',  correctPct: 91 },
    { id: 2,  order: 2,  text: "(x+3)(x-2) ko'paytmani oching?",                                          topic: 'Algebra',      difficulty: 'Oson',  correctPct: 88 },
    { id: 3,  order: 3,  text: "x² - 5x + 6 = 0 tenglama ildizlarini toping?",                            topic: 'Tenglama',     difficulty: 'Oson',  correctPct: 85 },
    { id: 4,  order: 4,  text: "|2x - 4| < 6 tengsizligini yeching?",                                     topic: 'Tengsizlik',   difficulty: "O'rta", correctPct: 72 },
    { id: 5,  order: 5,  text: "Ko'phadni butun son bo'lgichi bilan bo'lish algoritmini qo'llang?",        topic: 'Ko\'phad',     difficulty: "O'rta", correctPct: 63 },
    { id: 6,  order: 6,  text: "a³ - b³ ni kasr yordamida yozing?",                                       topic: 'Algebra',      difficulty: "O'rta", correctPct: 67 },
    { id: 7,  order: 7,  text: "Kvadrat tengsizlik: x² - 4 > 0 yechimlar to'plamini toping?",             topic: 'Tengsizlik',   difficulty: 'Qiyin', correctPct: 49 },
    { id: 8,  order: 8,  text: "2x + 3y = 12 va x - y = 1 sistemani yeching?",                            topic: 'Sistema',      difficulty: "O'rta", correctPct: 76 },
    { id: 9,  order: 9,  text: "Vigeta formulasi nima va qachon qo'llaniladi?",                            topic: 'Ko\'phad',     difficulty: 'Qiyin', correctPct: 38 },
    { id: 10, order: 10, text: "log₂(8) + log₂(4) = ?",                                                   topic: 'Logarifm',     difficulty: "O'rta", correctPct: 70 },
  ],
  3: [
    { id: 1,  order: 1,  text: "Kimyoviy reaksiyaning tezligiga ta'sir etuvchi omillar?",                  topic: 'Kinetika',    difficulty: 'Oson',  correctPct: 89 },
    { id: 2,  order: 2,  text: "Le Chatelier prinsipi nimani bildiradi?",                                   topic: 'Muvozanat',   difficulty: "O'rta", correctPct: 71 },
    { id: 3,  order: 3,  text: "H₂ + O₂ → H₂O tenglamani tenglashtiring?",                               topic: 'Reaksiya',    difficulty: 'Oson',  correctPct: 94 },
    { id: 4,  order: 4,  text: "Oksidlanish darajasini aniqlang: K₂Cr₂O₇ da Cr?",                        topic: 'Reaksiya',    difficulty: 'Qiyin', correctPct: 47 },
    { id: 5,  order: 5,  text: "Molyar massa nima va qanday hisoblanadi?",                                 topic: 'Mol',         difficulty: 'Oson',  correctPct: 86 },
    { id: 6,  order: 6,  text: "18 g suvda nechta mol molekula bor?",                                      topic: 'Mol',         difficulty: 'Oson',  correctPct: 83 },
    { id: 7,  order: 7,  text: "Kislota va asos o'zaro ta'sirlanishi qanday reaksiya?",                   topic: 'Reaksiya',    difficulty: 'Oson',  correctPct: 91 },
    { id: 8,  order: 8,  text: "Elektroliz jarayonini izohlang?",                                          topic: 'Elektrokimyo', difficulty: "O'rta", correctPct: 62 },
    { id: 9,  order: 9,  text: "Valentlik va oksidlanish darajasi farqi?",                                 topic: 'Valent',      difficulty: "O'rta", correctPct: 69 },
    { id: 10, order: 10, text: "Gibbs energiyasi va spontan reaksiyalar orasidagi bog'liqlik?",            topic: 'Termoximiya', difficulty: 'Qiyin', correctPct: 35 },
  ],
  4: [
    { id: 1,  order: 1,  text: "I have been studying for 3 hours. Qaysi zamon ishlatilgan?",              topic: 'Tenses',      difficulty: 'Oson',  correctPct: 88 },
    { id: 2,  order: 2,  text: "She ___ to Paris twice. (go) to'g'ri shaklni tanlang?",                   topic: 'Tenses',      difficulty: 'Oson',  correctPct: 84 },
    { id: 3,  order: 3,  text: "Past Simple vs Past Perfect farqini misol bilan tushuntiring?",            topic: 'Grammar',     difficulty: "O'rta", correctPct: 67 },
    { id: 4,  order: 4,  text: "Passive voice: They built the bridge in 1990. → ?",                       topic: 'Passive',     difficulty: "O'rta", correctPct: 72 },
    { id: 5,  order: 5,  text: "Conditional Type 2 ning tuzilishi va misollar?",                          topic: 'Conditional', difficulty: "O'rta", correctPct: 65 },
    { id: 6,  order: 6,  text: "Reported speech: He said 'I am tired.' → ?",                              topic: 'Reported',    difficulty: 'Qiyin', correctPct: 54 },
    { id: 7,  order: 7,  text: "Modal verb: must vs have to farqi?",                                      topic: 'Modals',      difficulty: "O'rta", correctPct: 71 },
    { id: 8,  order: 8,  text: "Gerund yoki Infinitive: I enjoy ___ (swim)?",                             topic: 'Grammar',     difficulty: 'Oson',  correctPct: 79 },
    { id: 9,  order: 9,  text: "Future Perfect: By 2030, scientists ___ a cure. (find)",                  topic: 'Tenses',      difficulty: 'Qiyin', correctPct: 48 },
    { id: 10, order: 10, text: "Prepositions: She arrived ___ Monday ___ 9 am?",                          topic: 'Prepositions', difficulty: 'Oson', correctPct: 81 },
  ],
  5: [
    { id: 1,  order: 1,  text: "Mitoxondriya qanday funktsiyani bajaradi?",                                topic: 'Organoid',    difficulty: 'Oson',  correctPct: 90 },
    { id: 2,  order: 2,  text: "DNK va RNK tuzilishining farqi nima?",                                    topic: 'DNK',         difficulty: "O'rta", correctPct: 74 },
    { id: 3,  order: 3,  text: "Fotosintez jarayoni qaysi organoidda boradi?",                            topic: 'Organoid',    difficulty: 'Oson',  correctPct: 93 },
    { id: 4,  order: 4,  text: "Mitoz va meyoz bo'linishining asosiy farqi?",                             topic: 'Hujayra',     difficulty: "O'rta", correctPct: 68 },
    { id: 5,  order: 5,  text: "Prokaryot va eukaryot hujayralarni solishtiring?",                        topic: 'Hujayra',     difficulty: "O'rta", correctPct: 71 },
    { id: 6,  order: 6,  text: "Ribosomalar qanday funksiyani bajaradi?",                                 topic: 'Organoid',    difficulty: 'Oson',  correctPct: 86 },
    { id: 7,  order: 7,  text: "Fermentlar haqida tushuncha bering va misollar keltiring?",               topic: 'Bioximiya',   difficulty: 'Qiyin', correctPct: 45 },
    { id: 8,  order: 8,  text: "Mendel qonunlarini izohlang?",                                            topic: 'Genetika',    difficulty: "O'rta", correctPct: 63 },
    { id: 9,  order: 9,  text: "Hujayraning hayot sikli bosqichlarini sanab o'ting?",                     topic: 'Hujayra',     difficulty: 'Qiyin', correctPct: 41 },
    { id: 10, order: 10, text: "ATP nima va u qanday hosil bo'ladi?",                                     topic: 'Bioximiya',   difficulty: "O'rta", correctPct: 67 },
  ],
  6: [
    { id: 1,  order: 1,  text: "Alisher Navoiyning to'liq ismi va tug'ilgan yili?",                      topic: 'Navoiy',      difficulty: 'Oson',  correctPct: 91 },
    { id: 2,  order: 2,  text: "\"Xamsa\" asari qanday janrga mansub?",                                   topic: 'Adabiyot',    difficulty: 'Oson',  correctPct: 85 },
    { id: 3,  order: 3,  text: "Muqimiyning asosiy ijod yo'nalishi qaysi?",                               topic: 'Klassik',     difficulty: "O'rta", correctPct: 72 },
    { id: 4,  order: 4,  text: "Cho'lponning \"Kecha va Kunduz\" asarining bosh qahramoni?",              topic: 'Klassik',     difficulty: "O'rta", correctPct: 69 },
    { id: 5,  order: 5,  text: "Navoiyning \"Layli va Majnun\" asaridagi asosiy g'oya?",                 topic: 'Navoiy',      difficulty: "O'rta", correctPct: 74 },
    { id: 6,  order: 6,  text: "G'azal janrining asosiy belgilari nima?",                                 topic: 'Adabiyot',    difficulty: 'Oson',  correctPct: 78 },
    { id: 7,  order: 7,  text: "Babur va uning adabiy merosi haqida so'zlang?",                           topic: 'Klassik',     difficulty: 'Qiyin', correctPct: 48 },
    { id: 8,  order: 8,  text: "\"Devonu lug'otit turk\" asarini kim yozgan?",                            topic: 'Adabiyot',    difficulty: 'Oson',  correctPct: 82 },
    { id: 9,  order: 9,  text: "Fitrat dramaturgi sifatida qanday asarlar yozgan?",                       topic: 'Klassik',     difficulty: 'Qiyin', correctPct: 37 },
    { id: 10, order: 10, text: "O'zbek xalq qo'shiqlarining asosiy janrlari?",                            topic: 'Adabiyot',    difficulty: "O'rta", correctPct: 65 },
  ],
  7: [
    { id: 1,  order: 1,  text: "Kubning to'liq sirti formulasi S = 6a². a = 4 bo'lsa, S = ?",            topic: 'Geometriya',    difficulty: 'Oson',  correctPct: 89 },
    { id: 2,  order: 2,  text: "Silindrning hajmi formulasini yozing?",                                   topic: 'Stereometriya', difficulty: 'Oson',  correctPct: 84 },
    { id: 3,  order: 3,  text: "Konus va silindr uchun yon sirt formulalari?",                            topic: 'Stereometriya', difficulty: "O'rta", correctPct: 71 },
    { id: 4,  order: 4,  text: "Sharning hajmi V = (4/3)πr³. r = 3 bo'lsa, V = ?",                      topic: 'Geometriya',    difficulty: "O'rta", correctPct: 66 },
    { id: 5,  order: 5,  text: "To'g'ri prizmaning diagonali formulasini chiqaring?",                     topic: 'Stereometriya', difficulty: 'Qiyin', correctPct: 47 },
    { id: 6,  order: 6,  text: "Koordinatalar sistemasida ikkita nuqta orasidagi masofa?",               topic: '3D',            difficulty: "O'rta", correctPct: 73 },
    { id: 7,  order: 7,  text: "Piramidaning hajmi formulasi va isboti?",                                 topic: 'Stereometriya', difficulty: 'Qiyin', correctPct: 43 },
    { id: 8,  order: 8,  text: "Evklid va Arximedning geometriyaga qo'shgan hissasi?",                   topic: 'Geometriya',    difficulty: "O'rta", correctPct: 58 },
    { id: 9,  order: 9,  text: "Geksaedra (kubning) cho'qqilari, qirralari va yuzlari soni?",            topic: '3D',            difficulty: 'Oson',  correctPct: 81 },
    { id: 10, order: 10, text: "Ikki parallel tekislik orasidagi masofa qanday hisoblanadi?",             topic: 'Stereometriya', difficulty: 'Qiyin', correctPct: 36 },
  ],
  8: [
    { id: 1,  order: 1,  text: "Yorug'likning sinish qonunini ifodalang?",                                topic: 'Optika',    difficulty: 'Oson',  correctPct: 86 },
    { id: 2,  order: 2,  text: "Linzalar: to'plovchi va sochuvchi linza farqi?",                          topic: 'Optika',    difficulty: 'Oson',  correctPct: 82 },
    { id: 3,  order: 3,  text: "Elektr qarshilik va o'tkazuvchanlik orasidagi bog'liqlik?",               topic: 'Elektr',    difficulty: 'Oson',  correctPct: 90 },
    { id: 4,  order: 4,  text: "Ohm qonuni: I = U/R. U = 12V, R = 4Ω bo'lsa, I = ?",                   topic: 'Ohm',       difficulty: 'Oson',  correctPct: 93 },
    { id: 5,  order: 5,  text: "Ketma-ket va parallel ulangan qarshiliklar formulasi?",                   topic: 'Elektr',    difficulty: "O'rta", correctPct: 74 },
    { id: 6,  order: 6,  text: "Elektr quvvati P = UI formulasidan foydalaning?",                         topic: 'Elektr',    difficulty: "O'rta", correctPct: 69 },
    { id: 7,  order: 7,  text: "To'liq ichki qaytish hodisasini tushuntiring?",                           topic: 'Optika',    difficulty: 'Qiyin', correctPct: 48 },
    { id: 8,  order: 8,  text: "Transformator ishlash prinsipi va unumdorligi?",                          topic: 'Elektr',    difficulty: 'Qiyin', correctPct: 43 },
    { id: 9,  order: 9,  text: "Nur interferentsiyasi va difraksiyasi qanday farqlanadi?",                topic: 'Optika',    difficulty: 'Qiyin', correctPct: 39 },
    { id: 10, order: 10, text: "Elektromagnit to'lqinlar spektri va uning bo'limlari?",                   topic: 'Optika',    difficulty: "O'rta", correctPct: 61 },
  ],
};
