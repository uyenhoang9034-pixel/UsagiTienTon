import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ALLOWED_EVENT_FILES = new Set([
  'ready.js',
  'interactionCreate.js',
  'messageCreate.js',
  'voiceStateUpdate.js',
]);

export default async function loadEvents(client) {
  const eventsPath = join(__dirname, '../../events');
  const allFiles = await readdir(eventsPath);
  const eventFiles = allFiles
    .filter((file) => file.endsWith('.js'))
    .filter((file) => ALLOWED_EVENT_FILES.has(file));

  logger.info(
    `Found ${eventFiles.length} allowed event files to load; skipped ${allFiles.length - eventFiles.length} non-scope files`,
  );

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);

    try {
      const { default: event } = await import(pathToFileURL(filePath).href);

      if (!event?.name || typeof event.execute !== 'function') {
        logger.warn(`Event ${file} is missing required "name" or "execute" properties.`);
        continue;
      }

      const safeExecute = async (...args) => {
        try {
          await event.execute(...args, client);
        } catch (error) {
          logger.error(`Error executing event ${event.name}:`, error);
        }
      };

      if (event.once) {
        client.once(event.name, safeExecute);
        logger.info(`✅ Registered once event: ${event.name}`);
      } else {
        client.on(event.name, safeExecute);
        logger.info(`✅ Registered event: ${event.name}`);
      }
    } catch (error) {
      logger.error(`Error loading event ${file}:`, error);
      throw error;
    }
  }
}
