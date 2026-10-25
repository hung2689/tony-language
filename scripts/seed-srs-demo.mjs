import { runSql, cleanSrsDemo } from './clean-srs-demo.mjs';

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

export async function seedSrsDemo() {
  console.log('🌱 Starting SRS demo data seeding...');

  // 1. Clean existing demo data first for full idempotency
  await cleanSrsDemo();

  // 2. Ensure test user demo_srs exists
  const ensureUserSql = `
    INSERT INTO users (username, email, password_hash, created_at, updated_at)
    SELECT 'demo_srs', 'demo_srs@example.com', '$2a$10$Q8N6bFM9YTQaWEBuOjcnZ.t8DqboBScfYpvGG03dBQl/PS.3ZULfK', NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'demo_srs@example.com');
  `;
  runSql(ensureUserSql);

  // Retrieve user IDs for demo_srs and tony
  const getIdsSql = `SELECT id, username FROM users WHERE username IN ('demo_srs', 'tony');`;
  const idsResult = runSql(getIdsSql);
  const targetUserIds = [];
  for (const line of idsResult.split('\n')) {
    const parts = line.trim().split('|').map(s => s.trim());
    if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
      targetUserIds.push({ id: parseInt(parts[0], 10), username: parts[1] });
    }
  }

  if (targetUserIds.length === 0) {
    throw new Error('No target user found to seed SRS data.');
  }

  console.log('Seeding for users:', targetUserIds);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // 40 Realistic English words with Vietnamese meaning, pronunciation, word_type, and example
  const demoWords = [
    // --- 8 MỚI (Repetitions = 0, Unseen) ---
    { word: 'serendipity', type: 'n', ipa: '/ˌser.ənˈdɪp.ə.ti/', meaning: 'sự tình cờ may mắn', ex: 'Finding this book was pure serendipity.', group: 'new' },
    { word: 'ephemeral', type: 'adj', ipa: '/ɪˈfem.ər.əl/', meaning: 'phù du, chóng tàn', ex: 'Fame in the internet age can be ephemeral.', group: 'new' },
    { word: 'eloquence', type: 'n', ipa: '/ˈel.ə.kwəns/', meaning: 'tài hùng biện', ex: 'She expressed her ideas with great eloquence.', group: 'new' },
    { word: 'ubiquitous', type: 'adj', ipa: '/juːˈbɪk.wɪ.təs/', meaning: 'có mặt ở khắp nơi', ex: 'Smartphones are now ubiquitous in daily life.', group: 'new' },
    { word: 'resilient', type: 'adj', ipa: '/rɪˈzɪl.jənt/', meaning: 'kiên cường, phục hồi nhanh', ex: 'The local economy has proven to be remarkably resilient.', group: 'new' },
    { word: 'pragmatic', type: 'adj', ipa: '/præɡˈmæt.ɪk/', meaning: 'thực tế, thực dụng', ex: 'We need to take a pragmatic approach to this problem.', group: 'new' },
    { word: 'meticulous', type: 'adj', ipa: '/məˈtɪk.jə.ləs/', meaning: 'tỉ mỉ, cẩn thận', ex: 'He is always meticulous about his financial records.', group: 'new' },
    { word: 'candid', type: 'adj', ipa: '/ˈkæn.dɪd/', meaning: 'thẳng thắn, bộc trực', ex: 'She gave us her candid opinion on the proposal.', group: 'new' },

    // --- 10 ĐANG TIẾP THU (Interval 1-6 ngày) ---
    { word: 'apple', type: 'n', ipa: '/ˈæp.əl/', meaning: 'quả táo', ex: 'An apple a day keeps the doctor away.', group: 'learning', reps: 1, interval: 1, ef: 2.50, dueOffsetDays: -1, correct: 1, wrong: 0 },
    { word: 'banana', type: 'n', ipa: '/bəˈnæn.ə/', meaning: 'quả chuối', ex: 'Monkeys love eating yellow bananas.', group: 'learning', reps: 1, interval: 1, ef: 2.50, dueOffsetDays: -2, correct: 1, wrong: 0 },
    { word: 'orange', type: 'n', ipa: '/ˈɒr.ɪndʒ/', meaning: 'quả cam', ex: 'Fresh orange juice is full of vitamin C.', group: 'learning', reps: 2, interval: 6, ef: 2.60, dueOffsetDays: 0, correct: 2, wrong: 0 },
    { word: 'coffee', type: 'n', ipa: '/ˈkɒf.i/', meaning: 'cà phê', ex: 'I need a hot cup of coffee to start the morning.', group: 'learning', reps: 1, interval: 1, ef: 2.50, dueOffsetDays: 0, correct: 1, wrong: 0 },
    { word: 'bread', type: 'n', ipa: '/bred/', meaning: 'bánh mì', ex: 'Freshly baked bread smells wonderful.', group: 'learning', reps: 1, interval: 2, ef: 2.40, dueOffsetDays: 0, correct: 1, wrong: 1 },
    { word: 'water', type: 'n', ipa: '/ˈwɔː.tər/', meaning: 'nước', ex: 'Drink plenty of water throughout the day.', group: 'learning', reps: 2, interval: 4, ef: 2.50, dueOffsetDays: 1, correct: 2, wrong: 0 },
    { word: 'house', type: 'n', ipa: '/haʊs/', meaning: 'ngôi nhà', ex: 'They built a beautiful wooden house near the lake.', group: 'learning', reps: 2, interval: 5, ef: 2.50, dueOffsetDays: 2, correct: 2, wrong: 0 },
    { word: 'tree', type: 'n', ipa: '/triː/', meaning: 'cái cây', ex: 'The old oak tree provides lovely shade in summer.', group: 'learning', reps: 1, interval: 3, ef: 2.50, dueOffsetDays: 1, correct: 1, wrong: 0 },
    { word: 'river', type: 'n', ipa: '/ˈrɪv.ər/', meaning: 'dòng sông', ex: 'The river flows gently through the green valley.', group: 'learning', reps: 2, interval: 6, ef: 2.60, dueOffsetDays: 3, correct: 2, wrong: 0 },
    { word: 'cloud', type: 'n', ipa: '/klaʊd/', meaning: 'đám mây', ex: 'White fluffy clouds drifted across the blue sky.', group: 'learning', reps: 1, interval: 2, ef: 2.50, dueOffsetDays: 2, correct: 1, wrong: 0 },

    // --- 8 ĐANG CỦNG CỐ (Interval 7-21 ngày) ---
    { word: 'mountain', type: 'n', ipa: '/ˈmaʊn.tɪn/', meaning: 'ngọn núi', ex: 'We climbed to the peak of the snowy mountain.', group: 'reviewing', reps: 3, interval: 14, ef: 2.50, dueOffsetDays: 0, correct: 3, wrong: 0 },
    { word: 'ocean', type: 'n', ipa: '/ˈəʊ.ʃən/', meaning: 'đại dương', ex: 'The Pacific Ocean is the largest ocean on Earth.', group: 'reviewing', reps: 3, interval: 15, ef: 2.50, dueOffsetDays: 0, correct: 3, wrong: 0 },
    { word: 'forest', type: 'n', ipa: '/ˈfɒr.ɪst/', meaning: 'khu rừng', ex: 'Many wild animals live in this dense tropical forest.', group: 'reviewing', reps: 3, interval: 12, ef: 2.60, dueOffsetDays: 4, correct: 3, wrong: 0 },
    { word: 'winter', type: 'n', ipa: '/ˈwɪn.tər/', meaning: 'mùa đông', ex: 'Snow falls heavily during the cold winter months.', group: 'reviewing', reps: 3, interval: 16, ef: 2.70, dueOffsetDays: 7, correct: 3, wrong: 0 },
    { word: 'summer', type: 'n', ipa: '/ˈsʌm.ər/', meaning: 'mùa hè', ex: 'Children enjoy swimming during the long summer vacation.', group: 'reviewing', reps: 3, interval: 18, ef: 2.60, dueOffsetDays: 9, correct: 3, wrong: 0 },
    { word: 'spring', type: 'n', ipa: '/sprɪŋ/', meaning: 'mùa xuân', ex: 'Flowers begin to bloom when spring arrives.', group: 'reviewing', reps: 3, interval: 10, ef: 2.50, dueOffsetDays: 3, correct: 3, wrong: 0 },
    { word: 'autumn', type: 'n', ipa: '/ˈɔː.təm/', meaning: 'mùa thu', ex: 'Golden leaves fall gently from trees in autumn.', group: 'reviewing', reps: 3, interval: 20, ef: 2.70, dueOffsetDays: 12, correct: 3, wrong: 0 },
    { word: 'garden', type: 'n', ipa: '/ˈɡɑː.dən/', meaning: 'khu vườn', ex: 'She grows colorful roses and herbs in her back garden.', group: 'reviewing', reps: 3, interval: 14, ef: 2.50, dueOffsetDays: 6, correct: 3, wrong: 0 },

    // --- 8 ĐÃ THÀNH THẠO (Interval > 21 ngày, EF 2.5 - 2.8) ---
    { word: 'universe', type: 'n', ipa: '/ˈjuː.nɪ.vɜːs/', meaning: 'vũ trụ', ex: 'The universe is vast beyond human imagination.', group: 'mastered', reps: 4, interval: 35, ef: 2.70, dueOffsetDays: 20, correct: 4, wrong: 0 },
    { word: 'galaxy', type: 'n', ipa: '/ˈɡæl.ək.si/', meaning: 'thiên hà', ex: 'The Milky Way is our home spiral galaxy.', group: 'mastered', reps: 4, interval: 42, ef: 2.80, dueOffsetDays: 28, correct: 4, wrong: 0 },
    { word: 'philosophy', type: 'n', ipa: '/fɪˈlɒs.ə.fi/', meaning: 'triết học', ex: 'Ancient Greek philosophy shaped Western thought.', group: 'mastered', reps: 4, interval: 30, ef: 2.60, dueOffsetDays: 15, correct: 4, wrong: 0 },
    { word: 'harmony', type: 'n', ipa: '/ˈhɑː.mə.ni/', meaning: 'sự hòa hợp', ex: 'Living in harmony with nature brings peace of mind.', group: 'mastered', reps: 5, interval: 60, ef: 2.80, dueOffsetDays: 45, correct: 5, wrong: 0 },
    { word: 'wisdom', type: 'n', ipa: '/ˈwɪz.dəm/', meaning: 'sự thông thái', ex: 'Experience often brings wisdom and sound judgment.', group: 'mastered', reps: 4, interval: 28, ef: 2.60, dueOffsetDays: 18, correct: 4, wrong: 0 },
    { word: 'freedom', type: 'n', ipa: '/ˈfriː.dəm/', meaning: 'sự tự do', ex: 'Freedom of speech is a fundamental human right.', group: 'mastered', reps: 5, interval: 55, ef: 2.70, dueOffsetDays: 38, correct: 5, wrong: 0 },
    { word: 'courage', type: 'n', ipa: '/ˈkʌr.ɪdʒ/', meaning: 'lòng dũng cảm', ex: 'It takes great courage to stand up for what is right.', group: 'mastered', reps: 4, interval: 32, ef: 2.60, dueOffsetDays: 22, correct: 4, wrong: 0 },
    { word: 'serenity', type: 'n', ipa: '/səˈren.ə.ti/', meaning: 'sự thanh bình', ex: 'The quiet temple offered a rare sense of serenity.', group: 'mastered', reps: 5, interval: 70, ef: 2.80, dueOffsetDays: 50, correct: 5, wrong: 0 },

    // --- 6 TỪ KHÓ (Ease factor 1.3 - 1.6, wrongCount cao) ---
    { word: 'obstinate', type: 'adj', ipa: '/ˈɒb.stɪ.nət/', meaning: 'bướng bỉnh, ngoan cố', ex: 'He is too obstinate to admit his mistakes.', group: 'hard', reps: 0, interval: 1, ef: 1.30, dueOffsetDays: 0, correct: 2, wrong: 5 },
    { word: 'exacerbate', type: 'v', ipa: '/ɪɡˈzæs.ə.beɪt/', meaning: 'làm trầm trọng thêm', ex: 'Stress can exacerbate physical health problems.', group: 'hard', reps: 1, interval: 2, ef: 1.40, dueOffsetDays: 0, correct: 2, wrong: 4 },
    { word: 'equivocal', type: 'adj', ipa: '/ɪˈkwɪv.ə.kəl/', meaning: 'mập mờ, khó hiểu', ex: 'His equivocal answer left everyone confused.', group: 'hard', reps: 0, interval: 1, ef: 1.30, dueOffsetDays: 0, correct: 1, wrong: 6 },
    { word: 'fastidious', type: 'adj', ipa: '/fæsˈtɪd.i.əs/', meaning: 'khó tính, cầu toàn', ex: 'She is fastidious about keeping her desk tidy.', group: 'hard', reps: 1, interval: 2, ef: 1.50, dueOffsetDays: 1, correct: 2, wrong: 3 },
    { word: 'pernicious', type: 'adj', ipa: '/pəˈnɪʃ.əs/', meaning: 'nguy hại, độc hại', ex: 'Gossip can have a pernicious influence on teamwork.', group: 'hard', reps: 0, interval: 1, ef: 1.30, dueOffsetDays: 1, correct: 1, wrong: 4 },
    { word: 'capricious', type: 'adj', ipa: '/kəˈprɪʃ.əs/', meaning: 'thất thường, dễ thay đổi', ex: 'The mountain weather is famously capricious.', group: 'hard', reps: 1, interval: 3, ef: 1.50, dueOffsetDays: 2, correct: 2, wrong: 3 },
  ];

  for (const targetUser of targetUserIds) {
    console.log(`\n📦 Seeding Demo SRS deck & progress for user ${targetUser.username} (ID: ${targetUser.id})...`);

    // 1. Create Demo SRS Deck
    const createDeckSql = `
      INSERT INTO vocabulary_sets (user_id, name, description, created_at, updated_at)
      VALUES (${targetUser.id}, 'Demo SRS', 'Bộ từ vựng mẫu kiểm thử phân bổ thuật toán lặp lại ngắt quãng (SM-2) demo_srs', NOW(), NOW())
      RETURNING id;
    `;
    const deckResult = runSql(createDeckSql);
    let deckId = null;
    for (const line of deckResult.split('\n')) {
      const trimmed = line.trim();
      if (!isNaN(parseInt(trimmed, 10))) {
        deckId = parseInt(trimmed, 10);
        break;
      }
    }
    console.log(`Created Deck 'Demo SRS' ID: ${deckId}`);

    // 2. Batch Insert Vocabularies
    const vocabValues = demoWords.map(w => 
      `(${escapeSql(w.word)}, ${escapeSql(w.meaning)}, ${escapeSql(w.type)}, ${escapeSql(w.ipa)}, ${escapeSql(w.ex)}, 'demo_srs', NOW(), NOW())`
    ).join(',\n');

    const insertVocabSql = `
      INSERT INTO vocabularies (word, meaning, word_type, pronunciation, example_sentence, example_paragraph, created_at, updated_at)
      VALUES ${vocabValues}
      RETURNING id, word;
    `;
    const res = runSql(insertVocabSql);
    const vocabIds = [];
    for (const line of res.split('\n')) {
      const parts = line.trim().split('|').map(s => s.trim());
      if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
        const id = parseInt(parts[0], 10);
        const word = parts[1];
        const original = demoWords.find(dw => dw.word === word);
        if (original) {
          vocabIds.push({ id, ...original });
        }
      }
    }

    // 3. Batch link to deck
    const vsiValues = vocabIds.map(v => `(${deckId}, ${v.id})`).join(', ');
    runSql(`INSERT INTO vocabulary_set_items (vocabulary_set_id, vocabulary_id) VALUES ${vsiValues};`);
    console.log(`Linked ${vocabIds.length} vocabularies to deck ${deckId}`);

    // 4. Batch insert Study Progress
    const spValues = vocabIds.map(item => {
      if (item.group === 'new') {
        return `(${targetUser.id}, ${item.id}, 0, 0, 0.00, 0, 0.00, 0, NULL, NULL, 0, 2.50, 0, NOW(), NOW())`;
      }
      const nextReviewDate = new Date(now.getTime() + item.dueOffsetDays * dayMs);
      const lastReviewedDate = new Date(now.getTime() - (item.interval || 1) * dayMs);
      const totalAttempts = (item.correct || 0) + (item.wrong || 0);
      const accuracy = totalAttempts > 0 ? ((item.correct * 100.0) / totalAttempts).toFixed(2) : '0.00';
      
      let memLevel = 1;
      if (item.interval > 21) memLevel = 3;
      else if (item.interval >= 7) memLevel = 2;

      return `(${targetUser.id}, ${item.id}, ${item.correct || 0}, ${item.wrong || 0}, ${accuracy}, ${item.reps || 0}, 0.00, ${memLevel}, '${lastReviewedDate.toISOString()}', '${nextReviewDate.toISOString()}', ${item.interval || 1}, ${item.ef.toFixed(2)}, ${item.reps || 0}, NOW(), NOW())`;
    }).join(',\n');

    runSql(`
      INSERT INTO study_progress (
        user_id, vocabulary_id, correct_count, wrong_count, accuracy, current_streak,
        difficulty, memory_level, last_reviewed_at, next_review_at, interval_days,
        ease_factor, repetitions, created_at, updated_at
      ) VALUES ${spValues};
    `);

    // 5. Create Active Study Plan (Target date: today + 26 days, max 10 new words/day)
    const targetDateStr = new Date(now.getTime() + 26 * dayMs).toISOString().split('T')[0];
    runSql(`UPDATE study_plans SET status = 'COMPLETED' WHERE user_id = ${targetUser.id};`);

    const insertPlanSql = `
      INSERT INTO study_plans (
        user_id, name, target_date, max_new_words_per_day, min_words_per_day,
        timezone, hard_gate_enabled, status, created_at, updated_at
      ) VALUES (
        ${targetUser.id}, 'Lộ trình Demo SM-2', '${targetDateStr}', 10, 5,
        'Asia/Ho_Chi_Minh', false, 'ACTIVE', NOW(), NOW()
      ) RETURNING id;
    `;
    const planResult = runSql(insertPlanSql);
    let planId = null;
    for (const line of planResult.split('\n')) {
      const trimmed = line.trim();
      if (!isNaN(parseInt(trimmed, 10))) {
        planId = parseInt(trimmed, 10);
        break;
      }
    }

    if (planId) {
      runSql(`INSERT INTO study_plan_decks (study_plan_id, deck_id, added_at) VALUES (${planId}, ${deckId}, NOW());`);
      console.log(`Created active study plan 'Lộ trình Demo SM-2' (ID: ${planId}) linked to deck ${deckId}`);
    }

    // 6. Generate 90-day Study History for realistic Heatmap & Accuracy (~78%)
    console.log(`Generating 90 days of study history for heatmap and analytics...`);
    const practicedVocabs = vocabIds.filter(v => v.group !== 'new');

    const sessionRows = [];
    for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
      // Irregular study pattern: skip ~1 in 3 days (rest days)
      if ((dayOffset % 7 === 1) || (dayOffset % 11 === 0) || (dayOffset % 5 === 0 && dayOffset % 2 === 0)) {
        continue; // Rest day
      }

      const sessionDate = new Date(now.getTime() - dayOffset * dayMs + 9 * 3600 * 1000); // 9:00 AM
      const completedDate = new Date(sessionDate.getTime() + 12 * 60 * 1000); // 12 mins session

      let questionCount = 8;
      if (dayOffset % 19 === 0) {
        questionCount = 52; // Level 4
      } else if (dayOffset % 4 === 0) {
        questionCount = 32; // Level 3
      } else if (dayOffset % 2 === 0) {
        questionCount = 18; // Level 2
      } else {
        questionCount = 8;  // Level 1
      }

      const correctAnswers = Math.round(questionCount * (0.72 + (dayOffset % 5) * 0.03));
      const wrongAnswers = questionCount - correctAnswers;

      sessionRows.push(`(${targetUser.id}, ${deckId}, 'EN_TO_VI', '${sessionDate.toISOString()}', '${completedDate.toISOString()}', ${questionCount}, ${correctAnswers}, ${wrongAnswers})`);
    }

    const insertSessionsSql = `
      INSERT INTO study_sessions (
        user_id, vocabulary_set_id, study_mode, started_at, completed_at,
        total_questions, correct_answers, wrong_answers
      ) VALUES ${sessionRows.join(',\n')}
      RETURNING id, started_at;
    `;
    const sessionsOutput = runSql(insertSessionsSql);
    const createdSessionIds = [];
    for (const line of sessionsOutput.split('\n')) {
      const parts = line.trim().split('|').map(s => s.trim());
      if (parts.length >= 1 && !isNaN(parseInt(parts[0], 10))) {
        createdSessionIds.push(parseInt(parts[0], 10));
      }
    }

    // Insert sample study answers for the sessions
    const answerRows = [];
    for (const sId of createdSessionIds) {
      for (let q = 0; q < 3; q++) {
        const v = practicedVocabs[q % practicedVocabs.length];
        const isCorr = q < 2;
        answerRows.push(`(${sId}, ${v.id}, 'EN_TO_VI', ${isCorr ? escapeSql(v.meaning) : escapeSql('sai')}, ${isCorr}, 'demo_ans_${sId}_${q}', false, 1)`);
      }
    }

    if (answerRows.length > 0) {
      runSql(`
        INSERT INTO study_answers (
          session_id, vocabulary_id, question_type, user_answer, is_correct,
          client_answer_id, override, attempt_no
        ) VALUES ${answerRows.join(',\n')};
      `);
    }
  }

  console.log('🎉 Seeding finished successfully!');
}

if (process.argv[1]?.endsWith('seed-srs-demo.mjs')) {
  seedSrsDemo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
