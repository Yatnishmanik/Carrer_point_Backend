import process from 'node:process';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for AR Career Point...');

  // 1. Create Default Admin & Student Users
  const adminSeedPassword = process.env.SEED_ADMIN_PASSWORD;
  const studentSeedPassword = process.env.SEED_STUDENT_PASSWORD;
  const superadminSeedPassword = process.env.SEED_SUPERADMIN_PASSWORD;
  const superadminSeedEmail = (process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@arcareerpoint.com').toLowerCase().trim();
  if (!adminSeedPassword || !studentSeedPassword || !superadminSeedPassword || adminSeedPassword.length < 12 || studentSeedPassword.length < 12 || superadminSeedPassword.length < 12) {
    throw new Error('Set SEED_ADMIN_PASSWORD, SEED_STUDENT_PASSWORD, and SEED_SUPERADMIN_PASSWORD to unique passwords of at least 12 characters.');
  }
  const adminPassword = await bcrypt.hash(adminSeedPassword, 10);
  const studentPassword = await bcrypt.hash(studentSeedPassword, 10);
  const superadminPassword = await bcrypt.hash(superadminSeedPassword, 10);

  const superadminUser = await prisma.user.upsert({
    where: { email: superadminSeedEmail },
    update: { password: superadminPassword, role: Role.SUPERADMIN },
    create: {
      name: 'Platform Superadmin',
      email: superadminSeedEmail,
      password: superadminPassword,
      role: Role.SUPERADMIN,
      targetExam: 'Platform Administration',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@arcareerpoint.com' },
    update: { password: adminPassword, role: Role.ADMIN },
    create: {
      name: 'प्रशासनिक अधिकारी (Admin Officer)',
      email: 'admin@arcareerpoint.com',
      password: adminPassword,
      role: Role.ADMIN,
      targetExam: 'All Exam Controller',
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student.demo@arcareerpoint.com' },
    update: { password: studentPassword, role: Role.STUDENT },
    create: {
      name: 'राहुल शर्मा (Demo Student)',
      email: 'student.demo@arcareerpoint.com',
      password: studentPassword,
      role: Role.STUDENT,
      targetExam: 'Bihar Board Class 10th',
    },
  });

  console.log(`👤 Users seeded: Superadmin (${superadminUser.email}), Admin (${adminUser.email}), Student (${studentUser.email})`);

  // 2. Exam Categories
  const examCategories = [
    {
      id: 'cat-bseb-10',
      name: 'Bihar Board Class 10th (Matric)',
      code: 'BSEB 10',
      icon: '📕',
      colorClass: 'from-amber-500 to-orange-400',
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      items: ['Chapter-wise Online Test', 'Model Paper 2025-2026', 'Previous Year Questions (PYQ)'],
      testCount: 48,
      category: 'bihar-board',
    },
    {
      id: 'cat-bseb-12',
      name: 'Bihar Board Class 12th (Inter)',
      code: 'BSEB 12',
      icon: '📘',
      colorClass: 'from-blue-600 to-indigo-500',
      accentColor: '#2563eb',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
      items: ['Science (Physics, Chem, Bio)', 'Arts & Commerce Mock Tests', 'Latest Official Model Papers'],
      testCount: 64,
      category: 'bihar-board',
    },
    {
      id: 'cat-rrb-ntpc',
      name: 'Railway RRB NTPC / Group D',
      code: 'RRB NTPC',
      icon: '🚆',
      colorClass: 'from-sky-500 to-cyan-600',
      accentColor: '#0284c7',
      gradient: 'linear-gradient(135deg, #0284c7 0%, #0891b2 100%)',
      items: ['General Awareness & Science', 'Mathematics & Reasoning', 'CBT 1 & CBT 2 Full Mocks'],
      testCount: 35,
      category: 'competitive',
    },
    {
      id: 'cat-ssc-gd',
      name: 'SSC GD Constable / CHSL',
      code: 'SSC GD',
      icon: '🏅',
      colorClass: 'from-yellow-500 to-amber-600',
      accentColor: '#d97706',
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      items: ['Mock Test & Speed Quizzes', 'Hindi / English Grammar', 'Daily Current Affairs Quiz'],
      testCount: 42,
      category: 'competitive',
    },
    {
      id: 'cat-bpsc',
      name: 'BPSC / Bihar Daroga (SI)',
      code: 'BPSC',
      icon: '🏛️',
      colorClass: 'from-purple-600 to-pink-500',
      accentColor: '#7c3aed',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
      items: ['Bihar Special GK & History', 'General Studies Full Length', 'PYQ 60th to 70th CCE'],
      testCount: 28,
      category: 'competitive',
    },
    {
      id: 'cat-all-exams',
      name: 'All Competitive & General Exams',
      code: 'ALL EXAMS',
      icon: '👥',
      colorClass: 'from-emerald-600 to-teal-500',
      accentColor: '#059669',
      gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
      items: ['Daily Current Affairs', 'General Science Essentials', 'Static GK & Constitution'],
      testCount: 90,
      category: 'all',
    },
  ];

  for (const cat of examCategories) {
    await prisma.examCategory.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }
  console.log(`📚 Seeded ${examCategories.length} exam categories.`);

  // 3. Create Sample Mock Tests with Questions
  const scienceTest = await prisma.test.upsert({
    include: { questions: true },
    where: { id: 'test-bseb-10-sci' },
    update: {},
    create: {
      id: 'test-bseb-10-sci',
      title: 'Bihar Board Class 10th - Science Special Mock Test',
      subtitle: 'Matric Board Exam Preparation · High Scoring Practice',
      categoryName: 'Bihar Board Class 10th',
      categoryId: 'cat-bseb-10',
      durationMinutes: 5,
      totalMarks: 8,
      passingMarks: 4,
      instructions: [
        'कुल 8 बहुविकल्पीय प्रश्न हैं।',
        'प्रत्येक सही उत्तर पर 1 अंक मिलेगा।',
        'प्रत्येक गलत उत्तर पर 0.25 अंक काटा जाएगा।',
        'समय समाप्त होने पर टेस्ट अपने-आप सबमिट हो जाएगा।',
      ],
      questions: {
        create: [
          {
            questionText: 'पौधों में भोजन का निर्माण किस प्रक्रिया द्वारा होता है?',
            subject: 'Biology',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'हरे पौधे सूर्य के प्रकाश की उपस्थिति में क्लोरोफिल, जल और कार्बन डाइऑक्साइड का उपयोग करके प्रकाश संश्लेषण (Photosynthesis) द्वारा अपना भोजन बनाते हैं।',
            options: {
              create: [
                { text: 'श्वसन (Respiration)', isCorrect: false, order: 0 },
                { text: 'वाष्पोत्सर्जन (Transpiration)', isCorrect: false, order: 1 },
                { text: 'प्रकाश संश्लेषण (Photosynthesis)', isCorrect: true, order: 2 },
                { text: 'पाचन (Digestion)', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            questionText: 'बल (Force) की SI इकाई क्या है?',
            subject: 'Physics',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'बल का SI मात्रक न्यूटन (N) है, जिसे वैज्ञानिक आइजैक न्यूटन के सम्मान में रखा गया है। (1 N = 1 kg·m/s²)',
            options: {
              create: [
                { text: 'जूल (Joule)', isCorrect: false, order: 0 },
                { text: 'न्यूटन (Newton)', isCorrect: true, order: 1 },
                { text: 'वाट (Watt)', isCorrect: false, order: 2 },
                { text: 'पास्कल (Pascal)', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            questionText: 'भारत का संविधान पूर्ण रूप से कब लागू हुआ था?',
            subject: 'Polity',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'भारतीय संविधान 26 नवंबर 1949 को अंगीकृत किया गया था तथा 26 जनवरी 1950 को पूरे देश में पूर्ण रूप से लागू किया गया, जिसे हम गणतंत्र दिवस के रूप में मनाते हैं।',
            options: {
              create: [
                { text: '15 अगस्त 1947', isCorrect: false, order: 0 },
                { text: '26 जनवरी 1950', isCorrect: true, order: 1 },
                { text: '26 नवंबर 1949', isCorrect: false, order: 2 },
                { text: '2 अक्टूबर 1950', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            questionText: 'शुद्ध जल का रासायनिक सूत्र क्या है?',
            subject: 'Chemistry',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'जल के एक अणु में दो हाइड्रोजन परमाणु और एक ऑक्सीजन परमाणु सहसंयोजक बंध द्वारा जुड़े होते हैं (H₂O)।',
            options: {
              create: [
                { text: 'CO₂', isCorrect: false, order: 0 },
                { text: 'O₂', isCorrect: false, order: 1 },
                { text: 'H₂O', isCorrect: true, order: 2 },
                { text: 'NaCl', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            questionText: 'हमारे सौरमंडल का सबसे बड़ा ग्रह कौन-सा है?',
            subject: 'General Science',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'बृहस्पति (Jupiter) सौरमंडल का सबसे बड़ा और सबसे भारी ग्रह है। यह एक गैसीय दानव है।',
            options: {
              create: [
                { text: 'पृथ्वी (Earth)', isCorrect: false, order: 0 },
                { text: 'मंगल (Mars)', isCorrect: false, order: 1 },
                { text: 'शनि (Saturn)', isCorrect: false, order: 2 },
                { text: 'बृहस्पति (Jupiter)', isCorrect: true, order: 3 },
              ],
            },
          },
          {
            questionText: 'मानव शरीर में रक्त का शुद्धिकरण किस अंग में होता है?',
            subject: 'Biology',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'वृक्क (Kidney) रक्त से यूरिया, यूरिक एसिड और अपशिष्ट पदार्थों को छानकर मूत्र के रूप में बाहर निकालता है।',
            options: {
              create: [
                { text: 'हृदय (Heart)', isCorrect: false, order: 0 },
                { text: 'वृक्क / गुर्दा (Kidney)', isCorrect: true, order: 1 },
                { text: 'यकृत (Liver)', isCorrect: false, order: 2 },
                { text: 'फेफड़े (Lungs)', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            questionText: 'बिहार में 1857 की क्रांति का नेतृत्व किसने किया था?',
            subject: 'History',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'जगदीशपुर (बिहार) के वीर कुंवर सिंह ने 80 वर्ष की आयु में 1857 के प्रथम स्वतंत्रता संग्राम में बिहार का अद्वितीय नेतृत्व किया।',
            options: {
              create: [
                { text: 'नाना साहेब', isCorrect: false, order: 0 },
                { text: 'तात्या टोपे', isCorrect: false, order: 1 },
                { text: 'वीर कुंवर सिंह', isCorrect: true, order: 2 },
                { text: 'रानी लक्ष्मीबाई', isCorrect: false, order: 3 },
              ],
            },
          },
          {
            questionText: 'विद्युत धारा (Electric Current) मापने वाला यंत्र कौन-सा है?',
            subject: 'Physics',
            marks: 1.0,
            negativeMarks: 0.25,
            explanation:
              'एमीटर (Ammeter) विद्युत परिपथ में धारा को एम्पीयर में मापता है और परिपथ में श्रेणीक्रम में जोड़ा जाता है।',
            options: {
              create: [
                { text: 'वोल्टमीटर (Voltmeter)', isCorrect: false, order: 0 },
                { text: 'एमीटर (Ammeter)', isCorrect: true, order: 1 },
                { text: 'गैल्वेनोमीटर (Galvanometer)', isCorrect: false, order: 2 },
                { text: 'ओह्ममीटर (Ohmmeter)', isCorrect: false, order: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`📝 Seeded Test: ${scienceTest.title}`);

  // 4. Seed Practice Sets
  const practiceSets = [
    {
      id: 'ps-1',
      testId: scienceTest.id,
      title: 'Bihar Board 10th Science Practice Set – 01',
      subject: 'Science (विज्ञान)',
      category: 'Bihar Board Class 10th',
      questionsCount: scienceTest.questions.length,
      durationMinutes: scienceTest.durationMinutes,
      isFree: true,
      difficulty: 'Easy',
    },
    {
      id: 'ps-2',
      title: 'Railway NTPC GK Practice Set – 01',
      subject: 'General Awareness (सामान्य ज्ञान)',
      category: 'Railway NTPC',
      questionsCount: 25,
      durationMinutes: 30,
      isFree: true,
      difficulty: 'Moderate',
    },
    {
      id: 'ps-3',
      title: 'SSC GD Reasoning Practice Set – 01',
      subject: 'Reasoning (तर्कशक्ति)',
      category: 'SSC GD',
      questionsCount: 25,
      durationMinutes: 30,
      isFree: true,
      difficulty: 'Moderate',
    },
  ];

  for (const ps of practiceSets) {
    await prisma.practiceSet.upsert({
      where: { id: ps.id },
      update: ps,
      create: ps,
    });
  }

  // 5. Seed Notice Updates
  const updates = [
    {
      id: 'up-1',
      title: 'Bihar Board Matric & Inter Exam 2026 Model Papers and Special Online Tests Live Now',
      date: 'Just now',
      badge: 'New',
    },
    {
      id: 'up-2',
      title: 'Railway NTPC & Group D General Knowledge 500+ Question Bank released for Free practice',
      date: '1 hour ago',
      badge: 'Popular',
    },
    {
      id: 'up-3',
      title: 'SSC GD 2026 Reasoning & Math chapter-wise mock tests updated with latest pattern',
      date: 'Today',
    },
  ];

  for (const up of updates) {
    await prisma.noticeUpdate.upsert({
      where: { id: up.id },
      update: up,
      create: up,
    });
  }

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
