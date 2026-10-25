import { execFileSync } from 'child_process';

const PSQL_PATH = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5433';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'language_learning';

export function runSql(sql) {
  return execFileSync(PSQL_PATH, ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME], {
    input: sql,
    env: { ...process.env, PGPASSWORD: DB_PASSWORD, PGCLIENTENCODING: 'UTF8' },
    encoding: 'utf8',
  });
}

export async function cleanSrsDemo() {
  console.log('🧹 Cleaning up SRS demo data...');

  const cleanupSql = `
    -- 1. Remove study answers tagged with demo_
    DELETE FROM study_answers 
    WHERE client_answer_id LIKE 'demo_%' 
       OR session_id IN (
         SELECT id FROM study_sessions WHERE study_mode LIKE 'demo_%' OR user_id IN (SELECT id FROM users WHERE username = 'demo_srs')
       );

    -- 2. Remove study sessions
    DELETE FROM study_sessions 
    WHERE study_mode LIKE 'demo_%' 
       OR user_id IN (SELECT id FROM users WHERE username = 'demo_srs')
       OR vocabulary_set_id IN (SELECT id FROM vocabulary_sets WHERE name = 'Demo SRS' OR name LIKE 'demo_%');

    -- 3. Remove study plan decks
    DELETE FROM study_plan_decks 
    WHERE study_plan_id IN (SELECT id FROM study_plans WHERE name LIKE 'demo_%' OR name = 'Lộ trình Demo SM-2')
       OR deck_id IN (SELECT id FROM vocabulary_sets WHERE name = 'Demo SRS' OR name LIKE 'demo_%');

    -- 4. Remove study plans
    DELETE FROM study_plans 
    WHERE name LIKE 'demo_%' 
       OR name = 'Lộ trình Demo SM-2'
       OR user_id IN (SELECT id FROM users WHERE username = 'demo_srs');

    -- 5. Remove study progress for demo vocabularies
    DELETE FROM study_progress 
    WHERE vocabulary_id IN (
      SELECT vsi.vocabulary_id FROM vocabulary_set_items vsi 
      JOIN vocabulary_sets vs ON vsi.vocabulary_set_id = vs.id 
      WHERE vs.name = 'Demo SRS' OR vs.name LIKE 'demo_%'
    ) OR user_id IN (SELECT id FROM users WHERE username = 'demo_srs');

    -- 6. Remove vocabulary set items
    DELETE FROM vocabulary_set_items 
    WHERE vocabulary_set_id IN (SELECT id FROM vocabulary_sets WHERE name = 'Demo SRS' OR name LIKE 'demo_%');

    -- 7. Remove vocabulary synonyms
    DELETE FROM vocabulary_synonyms 
    WHERE vocabulary_id IN (SELECT id FROM vocabularies WHERE example_paragraph = 'demo_srs' OR word LIKE 'demo_%');

    -- 8. Remove demo vocabularies
    DELETE FROM vocabularies 
    WHERE example_paragraph = 'demo_srs' OR word LIKE 'demo_%';

    -- 9. Remove demo vocabulary sets
    DELETE FROM vocabulary_sets 
    WHERE name = 'Demo SRS' OR name LIKE 'demo_%';
  `;

  try {
    runSql(cleanupSql);
    console.log('✅ Demo SRS data cleaned successfully!');
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    throw err;
  }
}

if (process.argv[1]?.endsWith('clean-srs-demo.mjs')) {
  cleanSrsDemo().catch(() => process.exit(1));
}
