import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Usagi Tiên Tôn hiện chỉ giữ:
 * - Music buttons
 * - Tu Tiên buttons
 * - Tu Tiên select menus
 *
 * Loader không được để 1 file interaction lỗi kéo sập toàn bộ hệ thống.
 */
const interactionTypes = ['buttons', 'selectMenus'];

const ALLOWED_INTERACTION_PATTERNS = [
  /^buttons\/tutien\.js$/,
  /^buttons\/tutienDailyQuest\.js$/,
  /^buttons\/tutienFormation\.js$/,
  /^buttons\/tutienShop\.js$/,
  /^buttons\/tutienPetCodex.*\.js$/,
  /^buttons\/tutienPetCollectionReward\.js$/,
  /^buttons\/music\/.*\.js$/,
  /^selectMenus\/tutien.*\.js$/,
];

function isAllowedInteraction(relativePath) {
  return ALLOWED_INTERACTION_PATTERNS.some((pattern) => pattern.test(relativePath));
}

async function getAllInteractionFiles(directory, fileList = []) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await getAllInteractionFiles(entryPath, fileList);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      fileList.push(entryPath);
    }
  }

  return fileList;
}

function normalizeModuleExport(moduleExport) {
  if (Array.isArray(moduleExport)) {
    return moduleExport;
  }

  return [moduleExport];
}

function isValidInteraction(interaction) {
  return Boolean(
    interaction &&
      typeof interaction.name === 'string' &&
      interaction.name.length > 0 &&
      typeof interaction.execute === 'function',
  );
}

export default async (client) => {
  try {
    const interactionsPath = join(__dirname, '../../interactions');

    for (const type of interactionTypes) {
      const typePath = join(interactionsPath, type);

      try {
        const interactionFiles = await getAllInteractionFiles(typePath);
        let loadedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const filePath of interactionFiles) {
          const relativePath = filePath
            .slice(interactionsPath.length + 1)
            .replace(/\\/g, '/');

          if (!isAllowedInteraction(relativePath)) {
            skippedCount += 1;
            continue;
          }

          const fileName = relativePath.split('/').pop();

          try {
            const module = await import(pathToFileURL(filePath).href);
            const interactions = normalizeModuleExport(module.default);

            for (const interaction of interactions) {
              if (!isValidInteraction(interaction)) {
                skippedCount += 1;
                logger.warn(`Interaction ${relativePath} in ${type} is missing required properties.`);
                continue;
              }

              client[type].set(interaction.name, interaction);
              loadedCount += 1;
              logger.info(`Loaded ${type.slice(0, -1)}: ${interaction.name} (${fileName})`);
            }
          } catch (error) {
            failedCount += 1;
            logger.error(`Failed to load ${type} interaction ${relativePath}:`, error);
          }
        }

        logger.info(
          `Loaded ${loadedCount} ${type}; skipped ${skippedCount}; failed ${failedCount}`,
        );
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.error(`Error loading ${type}:`, error);
          throw error;
        }

        logger.debug(`No ${type} directory found, skipping...`);
      }
    }
  } catch (error) {
    logger.error('Error loading interactions:', error);
    throw error;
  }
};
