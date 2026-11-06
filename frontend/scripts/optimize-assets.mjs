import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '..');
const publicDir = path.join(frontendDir, 'public');
const designAssetsDir = path.join(repoRoot, 'design-assets');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function moveFileOrDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  console.log(`Moved: ${path.relative(publicDir, src)} -> ${path.relative(repoRoot, dest)}`);
}

function removeFile(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Deleted: ${path.relative(publicDir, file)}`);
  }
}

function removeDirIfEmpty(dir) {
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    console.log(`Removed empty dir: ${path.relative(publicDir, dir)}`);
  }
}

async function convertToWebP(src, dest, quality = 80) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  await sharp(src)
    .webp({ quality, effort: 6 })
    .toFile(dest);
  console.log(`WebP created: ${path.relative(publicDir, dest)}`);
}

async function run() {
  console.log('=== PHASE 1C: OPTIMIZE ASSETS ===');

  // 1. Move unreferenced design / mockup dirs to design-assets/
  moveFileOrDir(
    path.join(publicDir, 'assets', 'game-ui'),
    path.join(designAssetsDir, 'game-ui')
  );

  moveFileOrDir(
    path.join(publicDir, 'assets', 'rpg', 'raw'),
    path.join(designAssetsDir, 'rpg', 'raw')
  );

  // Move unreferenced mockup files in assets/rpg
  const rpgMockups = [
    'adventurer.png', 'bg_left_embers.png', 'bg_right_embers.png', 'center-landscape.png',
    'chest-banner.png', 'chest-glow.png', 'chest-gold.png', 'chest_banner_exact.png',
    'day_cap_do.png', 'decks-crop.png', 'fox-mascot.png', 'helm_quest.png',
    'hero-bg.png', 'hero-fantasy-backdrop.png', 'hero-reference-crop.png',
    'hero_backdrop_compact.png', 'hero_full_reference.png', 'mid-top-crop.png',
    'quests-crop.png', 'test-bg.png', 'tier-1.png', 'tier-2.png', 'tier-3.png',
    'tier-4.png', 'tier-5.png', 'tier-6.png', 'tier-7.png', 'tier-8.png',
    'track_badge_1.png', 'track_badge_2.png', 'track_badge_3.png', 'track_badge_4.png',
    'winged_badge_2.png'
  ];
  rpgMockups.forEach(f => {
    moveFileOrDir(
      path.join(publicDir, 'assets', 'rpg', f),
      path.join(designAssetsDir, 'rpg', f)
    );
  });
  removeDirIfEmpty(path.join(publicDir, 'assets', 'rpg'));

  // Move unreferenced labels in assets/dia_danh
  const diaDanhUnused = [
    'label_citadel_mastery.png', 'label_forest_beginnings.png', 'label_harbor_travel.png',
    'label_mountains_discovery.png', 'label_village_conversations.png',
    'tag_level_advanced.png', 'tag_level_beginner.png', 'tag_level_intermediate.png'
  ];
  diaDanhUnused.forEach(f => {
    moveFileOrDir(
      path.join(publicDir, 'assets', 'dia_danh', f),
      path.join(designAssetsDir, 'dia_danh', f)
    );
  });

  // Move unreferenced slices in assets/flashcard
  const flashcardDir = path.join(publicDir, 'assets', 'flashcard');
  if (fs.existsSync(flashcardDir)) {
    const flashcardFiles = fs.readdirSync(flashcardDir);
    flashcardFiles.forEach(f => {
      if (
        f.startsWith('category_and_card_') ||
        f.startsWith('decoration_') ||
        f.startsWith('icon_and_badge_') ||
        f.startsWith('navigation_and_header_') ||
        f.startsWith('flashcard_flashcard-')
      ) {
        moveFileOrDir(
          path.join(flashcardDir, f),
          path.join(designAssetsDir, 'flashcard', f)
        );
      }
    });
  }

  // 2. Delete dead files
  const deadFiles = [
    path.join(publicDir, 'video', '13772604_3840_2160_60fps.mp4'),
    path.join(publicDir, 'assets', 'popup', 'spaced-repetition-paper-raw.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_desktop_raw.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_success_banner_raw.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_close_button_desktop.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_close_button_tight.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_cta_button_cutout.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_cta_button_pill.png'),
    path.join(publicDir, 'assets', 'popup', 'popup_pirate_ship.png'),
    path.join(publicDir, 'assets', 'cosmic-tunnel.jpg'),
  ];
  deadFiles.forEach(removeFile);
  removeDirIfEmpty(path.join(publicDir, 'video'));

  // 3. Delete exact duplicate files
  const duplicateFiles = [
    path.join(publicDir, 'assets', 'lexicon', 'animations', 'forest-island.mp4'),
    path.join(publicDir, 'assets', 'lexicon', 'animations', 'forest-island-mask.png'),
    path.join(publicDir, 'assets', 'backgrounds', 'spaced-repetition-paper.png'),
    path.join(publicDir, 'profile-paper-bg.png'),
    path.join(publicDir, 'assets', 'profile', 'profile-paper-bg.png'),
    path.join(publicDir, 'wanted-poster-bg.png'),
    path.join(publicDir, 'assets', 'profile', 'wanted-poster-bg.png'),
    path.join(publicDir, 'assets', 'profile', 'profile-right-sheet-bg.png'),
    path.join(publicDir, 'assets', 'profile', 'wanted-default-avatar.png'),
  ];
  duplicateFiles.forEach(removeFile);
  removeDirIfEmpty(path.join(publicDir, 'assets', 'lexicon', 'animations'));
  removeDirIfEmpty(path.join(publicDir, 'assets', 'lexicon'));
  removeDirIfEmpty(path.join(publicDir, 'assets', 'backgrounds'));

  // 4. Convert used large PNG/JPG files to WebP and remove old large originals
  const conversions = [
    // Backgrounds & Wallpapers
    {
      src: path.join(publicDir, 'assets', 'background', 'backgrounddao.png'),
      dest: path.join(publicDir, 'assets', 'background', 'backgrounddao.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'popup', 'spaced-repetition-paper.png'),
      dest: path.join(publicDir, 'assets', 'popup', 'spaced-repetition-paper.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'popup', 'popup_ship_decor.png'),
      dest: path.join(publicDir, 'assets', 'popup', 'popup_ship_decor.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'popup', 'popup_wave_decor.png'),
      dest: path.join(publicDir, 'assets', 'popup', 'popup_wave_decor.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'popup', 'popup_close_button.png'),
      dest: path.join(publicDir, 'assets', 'popup', 'popup_close_button.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'wallpapers', 'wallpaper-meadow.jpg'),
      dest: path.join(publicDir, 'wallpapers', 'wallpaper-meadow.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'wallpapers', 'wallpaper-forest.jpg'),
      dest: path.join(publicDir, 'wallpapers', 'wallpaper-forest.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'wallpapers', 'wallpaper-valley.jpg'),
      dest: path.join(publicDir, 'wallpapers', 'wallpaper-valley.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'auth-bg.png'),
      dest: path.join(publicDir, 'auth-bg.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'spaced-repetition', 'forecast-parchment-frame.png'),
      dest: path.join(publicDir, 'assets', 'spaced-repetition', 'forecast-parchment-frame.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'spaced-repetition', 'stat-parchment-frame.png'),
      dest: path.join(publicDir, 'assets', 'spaced-repetition', 'stat-parchment-frame.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'spaced-repetition', 'action-button-pill.png'),
      dest: path.join(publicDir, 'assets', 'spaced-repetition', 'action-button-pill.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'spaced-repetition', 'ornament-ribbon-banner.png'),
      dest: path.join(publicDir, 'assets', 'spaced-repetition', 'ornament-ribbon-banner.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'profile', 'backgrounds', 'profile-paper-bg.png'),
      dest: path.join(publicDir, 'assets', 'profile', 'backgrounds', 'profile-paper-bg.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'profile', 'backgrounds', 'wanted-poster-bg.png'),
      dest: path.join(publicDir, 'assets', 'profile', 'backgrounds', 'wanted-poster-bg.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'profile', 'profile-ship-illustration.png'),
      dest: path.join(publicDir, 'assets', 'profile', 'profile-ship-illustration.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'profile', 'profile-keep-exploring.png'),
      dest: path.join(publicDir, 'assets', 'profile', 'profile-keep-exploring.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'profile', 'wanted-portrait-overlay.png'),
      dest: path.join(publicDir, 'assets', 'profile', 'wanted-portrait-overlay.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'profile', 'default-avatar.png'),
      dest: path.join(publicDir, 'assets', 'profile', 'default-avatar.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'dia_danh', 'note_quote_every_word_opens_world.png'),
      dest: path.join(publicDir, 'assets', 'dia_danh', 'note_quote_every_word_opens_world.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'nen_texture', 'note_better_words_bigger_horizons.png'),
      dest: path.join(publicDir, 'assets', 'nen_texture', 'note_better_words_bigger_horizons.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'nen_texture', 'texture_parchment_panel.png'),
      dest: path.join(publicDir, 'assets', 'nen_texture', 'texture_parchment_panel.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'flashcard', 'vintage-map-bg.jpg'),
      dest: path.join(publicDir, 'assets', 'flashcard', 'vintage-map-bg.webp'),
      replaceOriginal: true,
      quality: 80
    },
    {
      src: path.join(publicDir, 'assets', 'flashcard', 'flashcard-page.png'),
      dest: path.join(publicDir, 'assets', 'flashcard', 'flashcard-page.webp'),
      replaceOriginal: true,
      quality: 80
    },
  ];

  // Islands (dao_dia_hinh)
  const islands = [
    'island_citadel_mastery.png',
    'island_forest_beginnings.png',
    'island_harbor_travel.png',
    'island_mountains_discovery.png',
    'island_village_conversations.png'
  ];
  for (const isl of islands) {
    conversions.push({
      src: path.join(publicDir, 'assets', 'dao_dia_hinh', isl),
      dest: path.join(publicDir, 'assets', 'dao_dia_hinh', isl.replace('.png', '.webp')),
      replaceOriginal: true,
      quality: 80
    });
  }

  // Rank badges: compress PNG (for tests) AND generate WebP
  const badges = [
    'rank-bronze.png', 'rank-diamond.png', 'rank-gold.png', 'rank-legendary.png',
    'rank-platinum.png', 'rank-silver.png', 'rank-supreme.png', 'rank-trainee.png'
  ];
  for (const b of badges) {
    const srcPng = path.join(publicDir, 'assets', 'badges', b);
    const destWebp = path.join(publicDir, 'assets', 'badges', b.replace('.png', '.webp'));
    if (fs.existsSync(srcPng)) {
      await sharp(srcPng).webp({ quality: 80, effort: 6 }).toFile(destWebp);
      // Re-compress the PNG to save space while keeping test compatibility
      const tmpPng = srcPng + '.tmp.png';
      await sharp(srcPng).png({ compressionLevel: 9, palette: true }).toFile(tmpPng);
      fs.renameSync(tmpPng, srcPng);
      console.log(`Rank badge optimized (both WebP & compressed PNG): ${b}`);
    }
  }

  // Execute conversions
  for (const c of conversions) {
    if (fs.existsSync(c.src)) {
      await convertToWebP(c.src, c.dest, c.quality);
      if (c.replaceOriginal) {
        removeFile(c.src);
      }
    }
  }

  // Calculate final size
  function getFolderSize(dir) {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) size += getFolderSize(full);
      else size += stat.size;
    }
    return size;
  }

  const finalBytes = getFolderSize(publicDir);
  console.log(`\nCOMPLETED! Final public/ directory size: ${(finalBytes / (1024 * 1024)).toFixed(2)} MB`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
