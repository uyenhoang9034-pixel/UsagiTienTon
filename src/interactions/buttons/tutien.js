import { MessageFlags } from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

const ERROR_LIMIT = 1800;

function formatError(error) {
  return String(
    error?.stack ||
      error?.message ||
      error ||
      'Unknown error',
  ).slice(
    0,
    ERROR_LIMIT,
  );
}

async function replyEphemeral(interaction, content) {
  const payload = {
    content,
    flags:
      MessageFlags.Ephemeral,
  };

  if (
    interaction.replied ||
    interaction.deferred
  ) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

async function replySystemError(interaction, title, error) {
  console.error(`[TU TIEN ERROR] ${title}`, error);

  try {
    return await replyEphemeral(
      interaction,
      `❌ **${title}:**\n\`\`\`js\n${formatError(error)}\n\`\`\``,
    );
  } catch (replyError) {
    console.error('[TU TIEN ERROR REPLY FAILED]', replyError);
    return null;
  }
}

async function rejectWrongPlayer(interaction, ownerId) {
  if (interaction.user.id === ownerId) {
    return false;
  }

  await replyEphemeral(
    interaction,
    'Đây là Tiên Lộ của một đạo hữu khác. Dùng `/tutien` để mở hành trình của riêng bạn.',
  );

  return true;
}

async function enforceChannel(interaction) {
  if (
    CULTIVATION_CONFIG.channelId &&
    interaction.channelId !== CULTIVATION_CONFIG.channelId
  ) {
    await replyEphemeral(
      interaction,
      `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
    );

    return false;
  }

  return true;
}

function ensureFunction(moduleObject, name, moduleLabel) {
  const fn = moduleObject?.[name];

  if (typeof fn !== 'function') {
    throw new Error(`${moduleLabel} thiếu export function ${name}`);
  }

  return fn;
}

async function loadCore() {
  const [service, ui] = await Promise.all([
    import('../../services/cultivationServiceV2.js'),
    import('../../services/cultivationUI.js'),
  ]);

  return { service, ui };
}

async function loadAdventure() {
  const [service, ui] = await Promise.all([
    import('../../services/cultivationAdventureV2.js'),
    import('../../services/cultivationAdventureV2UI.js'),
  ]);

  return { service, ui };
}

async function showAdventureError(interaction, ownerId) {
  try {
    const { ui } = await loadAdventure();
    const buildAdventureV2ErrorEmbed = ensureFunction(ui, 'buildAdventureV2ErrorEmbed', 'cultivationAdventureV2UI.js');
    const buildAdventureV2ErrorRows = ensureFunction(ui, 'buildAdventureV2ErrorRows', 'cultivationAdventureV2UI.js');

    return interaction.update({
      embeds: [buildAdventureV2ErrorEmbed()],
      components: buildAdventureV2ErrorRows(ownerId),
    });
  } catch (error) {
    return replySystemError(interaction, 'Lỗi hiển thị Thám Hiểm', error);
  }
}

async function handleDashboard(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadCore();
  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildDashboardEmbed', 'cultivationUI.js')(interaction.user, profile)],
    components: ensureFunction(ui, 'buildDashboardRows', 'cultivationUI.js')(ownerId),
  });
}

async function handleCultivate(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadCore();
  const result = await ensureFunction(service, 'cultivate', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildCultivateEmbed', 'cultivationUI.js')(result)],
    components: [ensureFunction(ui, 'buildBackRow', 'cultivationUI.js')(ownerId, 'cultivate')],
  });
}

async function handleBreakthrough(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadCore();
  const result = await ensureFunction(service, 'breakthrough', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildBreakthroughEmbed', 'cultivationUI.js')(result)],
    components: [ensureFunction(ui, 'buildBackRow', 'cultivationUI.js')(ownerId, 'breakthrough')],
  });
}

async function handleInventory(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadCore();
  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildInventoryEmbed', 'cultivationUI.js')(interaction.user, profile)],
    components: ensureFunction(ui, 'buildInventoryRows', 'cultivationUI.js')(ownerId, profile),
  });
}

async function handleUseItem(interaction, client, ownerId, guildId, userId, itemId) {
  if (!itemId) {
    return replyEphemeral(interaction, 'Không xác định được vật phẩm cần sử dụng.');
  }

  const { service, ui } = await loadCore();
  const result = await ensureFunction(service, 'useCultivationItem', 'cultivationService.js')(
    client,
    guildId,
    userId,
    itemId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildUseItemResultEmbed', 'cultivationUI.js')(result)],
    components: ensureFunction(ui, 'buildUseItemResultRows', 'cultivationUI.js')(ownerId),
  });
}

async function handleAlchemy(interaction, client, ownerId, guildId, userId) {
  const [{ service }, alchemyUI] = await Promise.all([
    loadCore(),
    import('../../services/cultivationAlchemyUI.js'),
  ]);

  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(alchemyUI, 'buildAlchemyEmbed', 'cultivationAlchemyUI.js')(interaction.user, profile)],
    components: ensureFunction(alchemyUI, 'buildAlchemyRows', 'cultivationAlchemyUI.js')(ownerId, profile),
  });
}

async function handleAlchemyMake(interaction, client, ownerId, guildId, userId, recipeId) {
  if (!recipeId) {
    return replyEphemeral(interaction, 'Không xác định được Đan Phương cần luyện.');
  }

  const [alchemy, alchemyUI] = await Promise.all([
    import('../../services/cultivationAlchemy.js'),
    import('../../services/cultivationAlchemyUI.js'),
  ]);

  const result = await ensureFunction(alchemy, 'brewCultivationPill', 'cultivationAlchemy.js')(
    client,
    guildId,
    userId,
    recipeId,
  );

  return interaction.update({
    embeds: [ensureFunction(alchemyUI, 'buildAlchemyResultEmbed', 'cultivationAlchemyUI.js')(result)],
    components: ensureFunction(alchemyUI, 'buildAlchemyResultRows', 'cultivationAlchemyUI.js')(ownerId),
  });
}

async function handleForge(interaction, client, ownerId, guildId, userId) {
  const [{ service }, equipmentUI] = await Promise.all([
    loadCore(),
    import('../../services/cultivationEquipmentUI.js'),
  ]);

  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(equipmentUI, 'buildForgeEmbed', 'cultivationEquipmentUI.js')(interaction.user, profile)],
    components: ensureFunction(equipmentUI, 'buildForgeRows', 'cultivationEquipmentUI.js')(ownerId),
  });
}

async function handleForgeMake(interaction, client, ownerId, guildId, userId, equipmentId) {
  if (!equipmentId) {
    return replyEphemeral(interaction, 'Không xác định được Pháp Khí cần luyện.');
  }

  const [equipment, equipmentUI] = await Promise.all([
    import('../../services/cultivationEquipment.js'),
    import('../../services/cultivationEquipmentUI.js'),
  ]);

  const result = await ensureFunction(equipment, 'forgeEquipment', 'cultivationEquipment.js')(
    client,
    guildId,
    userId,
    equipmentId,
  );

  return interaction.update({
    embeds: [ensureFunction(equipmentUI, 'buildForgeResultEmbed', 'cultivationEquipmentUI.js')(result)],
    components: ensureFunction(equipmentUI, 'buildForgeResultRows', 'cultivationEquipmentUI.js')(ownerId),
  });
}

async function handleEquipment(interaction, client, ownerId, guildId, userId) {
  const [{ service }, equipmentUI] = await Promise.all([
    loadCore(),
    import('../../services/cultivationEquipmentUI.js'),
  ]);

  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(equipmentUI, 'buildEquipmentEmbed', 'cultivationEquipmentUI.js')(interaction.user, profile)],
    components: ensureFunction(equipmentUI, 'buildEquipmentRows', 'cultivationEquipmentUI.js')(ownerId, profile),
  });
}

async function handleTechnique(interaction, client, ownerId, guildId, userId) {
  const [{ service }, techniqueUI] = await Promise.all([
    loadCore(),
    import('../../services/cultivationTechniqueUI.js'),
  ]);

  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(techniqueUI, 'buildTechniqueEmbed', 'cultivationTechniqueUI.js')(interaction.user, profile)],
    components: ensureFunction(techniqueUI, 'buildTechniqueRows', 'cultivationTechniqueUI.js')(ownerId, profile),
  });
}

async function handleTechniqueLearn(interaction, client, ownerId, guildId, userId, techniqueId) {
  if (!techniqueId) {
    return replyEphemeral(interaction, 'Không xác định được Công Pháp cần lĩnh ngộ.');
  }

  const [technique, techniqueUI] = await Promise.all([
    import('../../services/cultivationTechnique.js'),
    import('../../services/cultivationTechniqueUI.js'),
  ]);

  const result = await ensureFunction(technique, 'learnCultivationTechnique', 'cultivationTechnique.js')(
    client,
    guildId,
    userId,
    techniqueId,
  );

  return interaction.update({
    embeds: [ensureFunction(techniqueUI, 'buildTechniqueLearnResultEmbed', 'cultivationTechniqueUI.js')(result)],
    components: ensureFunction(techniqueUI, 'buildTechniqueResultRows', 'cultivationTechniqueUI.js')(ownerId),
  });
}

async function handleTreasure(interaction, client, ownerId, guildId, userId) {
  const [{ service }, treasureUI] = await Promise.all([
    loadCore(),
    import('../../services/cultivationTreasureUI.js'),
  ]);

  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(treasureUI, 'buildTreasureEmbed', 'cultivationTreasureUI.js')(interaction.user, profile)],
    components: ensureFunction(treasureUI, 'buildTreasureRows', 'cultivationTreasureUI.js')(ownerId, profile),
  });
}

async function handleTalismanActivate(interaction, client, ownerId, guildId, userId, talismanId) {
  if (!talismanId) {
    return replyEphemeral(interaction, 'Không xác định được Phù Hiệu cần kích hoạt.');
  }

  const [treasure, treasureUI] = await Promise.all([
    import('../../services/cultivationTreasure.js'),
    import('../../services/cultivationTreasureUI.js'),
  ]);

  const result = await ensureFunction(treasure, 'activateCultivationTalisman', 'cultivationTreasure.js')(
    client,
    guildId,
    userId,
    talismanId,
  );

  return interaction.update({
    embeds: [ensureFunction(treasureUI, 'buildTalismanResultEmbed', 'cultivationTreasureUI.js')(result)],
    components: ensureFunction(treasureUI, 'buildTalismanResultRows', 'cultivationTreasureUI.js')(ownerId),
  });
}

async function handlePet(interaction, client, ownerId, guildId, userId) {
  const [{ service }, petUI] = await Promise.all([
    loadCore(),
    import('../../services/cultivationPetUI.js'),
  ]);

  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(petUI, 'buildPetEmbed', 'cultivationPetUI.js')(interaction.user, profile)],
    components: ensureFunction(petUI, 'buildPetRows', 'cultivationPetUI.js')(ownerId, profile),
  });
}

async function handlePetCapture(interaction, client, ownerId, guildId, userId, petId) {
  if (!petId) {
    return replyEphemeral(interaction, 'Không xác định được Linh Thú cần thu phục.');
  }

  const [pet, petUI] = await Promise.all([
    import('../../services/cultivationPet.js'),
    import('../../services/cultivationPetUI.js'),
  ]);

  const result = await ensureFunction(pet, 'captureCultivationPet', 'cultivationPet.js')(
    client,
    guildId,
    userId,
    petId,
  );

  return interaction.update({
    embeds: [ensureFunction(petUI, 'buildPetCaptureResultEmbed', 'cultivationPetUI.js')(result)],
    components: ensureFunction(petUI, 'buildPetResultRows', 'cultivationPetUI.js')(ownerId),
  });
}

async function handleProfile(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadCore();
  const profile = await ensureFunction(service, 'getCultivationProfile', 'cultivationService.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildProfileEmbed', 'cultivationUI.js')(interaction.user, profile)],
    components: [ensureFunction(ui, 'buildBackRow', 'cultivationUI.js')(ownerId, 'profile')],
  });
}

async function handleLeaderboard(interaction, client, ownerId, guildId) {
  const { service, ui } = await loadCore();
  const entries = await ensureFunction(service, 'getCultivationLeaderboard', 'cultivationService.js')(
    client,
    guildId,
    10,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildLeaderboardEmbed', 'cultivationUI.js')(entries, interaction.guild)],
    components: [ensureFunction(ui, 'buildBackRow', 'cultivationUI.js')(ownerId, 'leaderboard')],
  });
}

async function handleAdventurePreview(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'getAdventureV2Preview', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2PreviewEmbed', 'cultivationAdventureV2UI.js')(interaction.user, result)],
    components: ensureFunction(ui, 'buildAdventureV2PreviewRows', 'cultivationAdventureV2UI.js')(ownerId, result.ok),
  });
}

async function handleAdventureStart(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'startAdventureV2', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    const preview = await ensureFunction(service, 'getAdventureV2Preview', 'cultivationAdventureV2.js')(
      client,
      guildId,
      userId,
    );

    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAdventureV2PreviewEmbed', 'cultivationAdventureV2UI.js')(interaction.user, preview)],
      components: ensureFunction(ui, 'buildAdventureV2PreviewRows', 'cultivationAdventureV2UI.js')(ownerId, false),
    });
  }

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2LocationEmbed', 'cultivationAdventureV2UI.js')(result.location)],
    components: ensureFunction(ui, 'buildAdventureV2LocationRows', 'cultivationAdventureV2UI.js')(ownerId, result.location),
  });
}

async function handleAdventureChoice(interaction, client, ownerId, guildId, userId, choiceId) {
  if (!choiceId) {
    return showAdventureError(interaction, ownerId);
  }

  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'resolveAdventureV2Choice', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
    choiceId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  if (result.type === 'pet_encounter_unknown') {
    const ui295 = await import('../../services/cultivationAdventureV295UI.js');

    return interaction.update({
      embeds: [ensureFunction(ui295, 'buildAdventurePetUnknownEmbed', 'cultivationAdventureV295UI.js')()],
      components: ensureFunction(ui295, 'buildAdventurePetUnknownRows', 'cultivationAdventureV295UI.js')(ownerId),
    });
  }

  if (result.type === 'equipment_resonance') {
    const ui295 = await import('../../services/cultivationAdventureV295UI.js');

    return interaction.update({
      embeds: [ensureFunction(ui295, 'buildEquipmentResonanceEmbed', 'cultivationAdventureV295UI.js')(result)],
      components: ensureFunction(ui295, 'buildAdventureV295BackRows', 'cultivationAdventureV295UI.js')(ownerId),
    });
  }

  if (result.type === 'technique_resonance') {
    const ui295 = await import('../../services/cultivationAdventureV295UI.js');

    return interaction.update({
      embeds: [ensureFunction(ui295, 'buildTechniqueResonanceEmbed', 'cultivationAdventureV295UI.js')(result)],
      components: ensureFunction(ui295, 'buildAdventureV295BackRows', 'cultivationAdventureV295UI.js')(ownerId),
    });
  }

  if (result.type === 'merchant') {
    const ui294 = await import('../../services/cultivationAdventureV294UI.js');

    return interaction.update({
      embeds: [ensureFunction(ui294, 'buildAdventureMerchantEmbed', 'cultivationAdventureV294UI.js')(result)],
      components: ensureFunction(ui294, 'buildAdventureMerchantRows', 'cultivationAdventureV294UI.js')(ownerId, result.stock),
    });
  }

  if (result.type === 'heavenly_fortune') {
    const ui294 = await import('../../services/cultivationAdventureV294UI.js');

    return interaction.update({
      embeds: [ensureFunction(ui294, 'buildHeavenlyFortuneEmbed', 'cultivationAdventureV294UI.js')(result)],
      components: ensureFunction(ui294, 'buildAdventureV294BackRows', 'cultivationAdventureV294UI.js')(ownerId),
    });
  }

  if (result.type === 'pet_encounter' && result.petEncounter) {
    const petUI = await import('../../services/cultivationPetUI.js');

    return interaction.update({
      embeds: [ensureFunction(petUI, 'buildPetEncounterEmbed', 'cultivationPetUI.js')(result.petEncounter)],
      components: ensureFunction(petUI, 'buildPetEncounterRows', 'cultivationPetUI.js')(ownerId, result.petEncounter),
    });
  }

  if (result.type === 'stone_tablet') {
    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientTabletEmbed', 'cultivationAdventureV2UI.js')()],
      components: ensureFunction(ui, 'buildAncientTabletRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  if (result.type === 'stone_gate') {
    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientGateEmbed', 'cultivationAdventureV2UI.js')()],
      components: ensureFunction(ui, 'buildAncientGateRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  if (result.type === 'secret_realm' && result.secretRealm) {
    const secretUI = await import('../../services/cultivationSecretRealmUI.js');

    return interaction.update({
      embeds: [ensureFunction(secretUI, 'buildSecretRealmDiscoverEmbed', 'cultivationSecretRealmUI.js')(result.secretRealm)],
      components: ensureFunction(secretUI, 'buildSecretRealmDiscoverRows', 'cultivationSecretRealmUI.js')(ownerId, result.secretRealm.id),
    });
  }

  if (result.type === 'monster') {
    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAdventureV2MonsterEmbed', 'cultivationAdventureV2UI.js')(result)],
      components: ensureFunction(ui, 'buildAdventureV2MonsterRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2ResultEmbed', 'cultivationAdventureV2UI.js')(result)],
    components: ensureFunction(ui, 'buildAdventureV2ResultRows', 'cultivationAdventureV2UI.js')(ownerId),
  });
}

async function handleAdventureMerchantBuy(interaction, client, ownerId, guildId, userId, itemId) {
  if (!itemId) {
    return showAdventureError(interaction, ownerId);
  }

  const [merchant, ui294] = await Promise.all([
    import('../../services/cultivationAdventureV294.js'),
    import('../../services/cultivationAdventureV294UI.js'),
  ]);

  const result = await ensureFunction(merchant, 'buyAdventureMerchantItem', 'cultivationAdventureV294.js')(
    client,
    guildId,
    userId,
    itemId,
  );

  if (!result.ok && result.reason === 'not_enough_stones') {
    return interaction.update({
      embeds: [ensureFunction(ui294, 'buildAdventureMerchantInsufficientEmbed', 'cultivationAdventureV294UI.js')(result)],
      components: ensureFunction(ui294, 'buildAdventureMerchantRows', 'cultivationAdventureV294UI.js')(ownerId, result.stock),
    });
  }

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui294, 'buildAdventureMerchantPurchaseEmbed', 'cultivationAdventureV294UI.js')(result)],
    components: ensureFunction(ui294, 'buildAdventureV294BackRows', 'cultivationAdventureV294UI.js')(ownerId),
  });
}

async function handleAdventureMerchantLeave(interaction, client, ownerId, guildId, userId) {
  const [merchant, ui294] = await Promise.all([
    import('../../services/cultivationAdventureV294.js'),
    import('../../services/cultivationAdventureV294UI.js'),
  ]);

  const result = await ensureFunction(merchant, 'leaveAdventureMerchant', 'cultivationAdventureV294.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui294, 'buildAdventureMerchantLeaveEmbed', 'cultivationAdventureV294UI.js')()],
    components: ensureFunction(ui294, 'buildAdventureV294BackRows', 'cultivationAdventureV294UI.js')(ownerId),
  });
}

async function handleAdventurePetReveal(interaction, client, ownerId, guildId, userId) {
  const [petAdventure, ui295] = await Promise.all([
    import('../../services/cultivationAdventureV295.js'),
    import('../../services/cultivationAdventureV295UI.js'),
  ]);

  const result = await ensureFunction(petAdventure, 'revealAdventurePet', 'cultivationAdventureV295.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui295, 'buildAdventurePetRevealEmbed', 'cultivationAdventureV295UI.js')(result)],
    components: ensureFunction(ui295, 'buildAdventurePetRevealRows', 'cultivationAdventureV295UI.js')(ownerId, result.pet),
  });
}

async function handleAdventurePetLeave(interaction, client, ownerId, guildId, userId) {
  const [petAdventure, ui295] = await Promise.all([
    import('../../services/cultivationAdventureV295.js'),
    import('../../services/cultivationAdventureV295UI.js'),
  ]);

  const result = await ensureFunction(petAdventure, 'leaveAdventurePetEncounter', 'cultivationAdventureV295.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui295, 'buildAdventurePetLeaveEmbed', 'cultivationAdventureV295UI.js')()],
    components: ensureFunction(ui295, 'buildAdventureV295BackRows', 'cultivationAdventureV295UI.js')(ownerId),
  });
}

async function handleAdventurePetCapture(interaction, client, ownerId, guildId, userId, petId) {
  if (!petId) {
    return showAdventureError(interaction, ownerId);
  }

  const [pet, petUI, petAdventure] = await Promise.all([
    import('../../services/cultivationPet.js'),
    import('../../services/cultivationPetUI.js'),
    import('../../services/cultivationAdventureV295.js'),
  ]);

  const result = await ensureFunction(pet, 'captureCultivationPet', 'cultivationPet.js')(
    client,
    guildId,
    userId,
    petId,
  );

  await ensureFunction(petAdventure, 'finishAdventurePetEncounter', 'cultivationAdventureV295.js')(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [ensureFunction(petUI, 'buildPetCaptureResultEmbed', 'cultivationPetUI.js')(result)],
    components: ensureFunction(petUI, 'buildPetResultRows', 'cultivationPetUI.js')(ownerId),
  });
}

async function handleAdventureAssist(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'getAdventureV2CombatInfo', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
    { petAssist: true },
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2AssistEmbed', 'cultivationAdventureV2UI.js')(result)],
    components: ensureFunction(ui, 'buildAdventureV2AssistRows', 'cultivationAdventureV2UI.js')(ownerId, Boolean(result.pet)),
  });
}

async function handleAdventureFight(interaction, client, ownerId, guildId, userId, petAssist) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'fightAdventureV2Monster', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
    { petAssist },
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2CombatResultEmbed', 'cultivationAdventureV2UI.js')(result)],
    components: ensureFunction(ui, 'buildAdventureV2ResultRows', 'cultivationAdventureV2UI.js')(ownerId),
  });
}

async function handleAdventureRetreat(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'retreatAdventureV2', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2RetreatEmbed', 'cultivationAdventureV2UI.js')(result)],
    components: ensureFunction(ui, 'buildAdventureV2RetreatRows', 'cultivationAdventureV2UI.js')(ownerId, result.success),
  });
}

async function handleAdventureComprehend(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'comprehendAncientTablet', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(ui, 'buildAdventureV2ResultEmbed', 'cultivationAdventureV2UI.js')(result)],
    components: ensureFunction(ui, 'buildAdventureV2ResultRows', 'cultivationAdventureV2UI.js')(ownerId),
  });
}

async function handleAdventureGateOpen(interaction, client, ownerId, guildId, userId) {
  const { service, ui } = await loadAdventure();
  const result = await ensureFunction(service, 'openAncientStoneGate', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  if (result.type === 'monster') {
    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAdventureV2MonsterEmbed', 'cultivationAdventureV2UI.js')(result)],
      components: ensureFunction(ui, 'buildAdventureV2MonsterRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  if (result.type === 'gate_failed') {
    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientGateFailedEmbed', 'cultivationAdventureV2UI.js')(result)],
      components: ensureFunction(ui, 'buildAdventureV2ResultRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  if (result.type === 'ancient_chest') {
    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientChestEmbed', 'cultivationAdventureV2UI.js')()],
      components: ensureFunction(ui, 'buildAncientChestRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  return showAdventureError(interaction, ownerId);
}

async function handleChestAction(interaction, client, ownerId, guildId, userId, action) {
  const { service, ui } = await loadAdventure();

  if (action === 'inspect') {
    const result = await ensureFunction(service, 'inspectAncientChest', 'cultivationAdventureV2.js')(
      client,
      guildId,
      userId,
    );

    if (!result.ok) {
      return showAdventureError(interaction, ownerId);
    }

    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientChestInspectEmbed', 'cultivationAdventureV2UI.js')(result)],
      components: ensureFunction(ui, 'buildAncientChestInspectRows', 'cultivationAdventureV2UI.js')(ownerId, result.trapped),
    });
  }

  if (action === 'disarm') {
    const result = await ensureFunction(service, 'disarmAncientChest', 'cultivationAdventureV2.js')(
      client,
      guildId,
      userId,
    );

    if (!result.ok) {
      return showAdventureError(interaction, ownerId);
    }

    return interaction.update({
      embeds: [ensureFunction(ui, 'buildChestDisarmEmbed', 'cultivationAdventureV2UI.js')(result)],
      components: ensureFunction(ui, 'buildChestDisarmRows', 'cultivationAdventureV2UI.js')(ownerId, result.success),
    });
  }

  if (action === 'open') {
    const result = await ensureFunction(service, 'openAncientChest', 'cultivationAdventureV2.js')(
      client,
      guildId,
      userId,
    );

    if (!result.ok) {
      return showAdventureError(interaction, ownerId);
    }

    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientChestResultEmbed', 'cultivationAdventureV2UI.js')(result)],
      components: ensureFunction(ui, 'buildAdventureV2ResultRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  if (action === 'leave') {
    const result = await ensureFunction(service, 'leaveAncientChest', 'cultivationAdventureV2.js')(
      client,
      guildId,
      userId,
    );

    if (!result.ok) {
      return showAdventureError(interaction, ownerId);
    }

    return interaction.update({
      embeds: [ensureFunction(ui, 'buildAncientChestLeaveEmbed', 'cultivationAdventureV2UI.js')()],
      components: ensureFunction(ui, 'buildAdventureV2ResultRows', 'cultivationAdventureV2UI.js')(ownerId),
    });
  }

  return showAdventureError(interaction, ownerId);
}

async function handleSecretRealmEnter(interaction, client, ownerId, guildId, userId, realmId) {
  if (!realmId) {
    return showAdventureError(interaction, ownerId);
  }

  const [adventure, secret, secretUI] = await Promise.all([
    import('../../services/cultivationAdventureV2.js'),
    import('../../services/cultivationSecretRealm.js'),
    import('../../services/cultivationSecretRealmUI.js'),
  ]);

  const started = await ensureFunction(secret, 'startSecretRealm', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
    realmId,
  );

  if (!started.ok) {
    return showAdventureError(interaction, ownerId);
  }

  await ensureFunction(adventure, 'clearAdventureV2Session', 'cultivationAdventureV2.js')(
    client,
    guildId,
    userId,
  );

  const result = await ensureFunction(secret, 'enterSecretRealmFloor', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(secretUI, 'buildSecretRealmFloorEmbed', 'cultivationSecretRealmUI.js')(result)],
    components: ensureFunction(secretUI, 'buildSecretRealmFloorRows', 'cultivationSecretRealmUI.js')(ownerId),
  });
}

async function handleSecretRealmAssist(interaction, client, ownerId, guildId, userId) {
  const [secret, secretUI] = await Promise.all([
    import('../../services/cultivationSecretRealm.js'),
    import('../../services/cultivationSecretRealmUI.js'),
  ]);

  const result = await ensureFunction(secret, 'getSecretRealmCombatInfo', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
    { petAssist: true },
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(secretUI, 'buildSecretRealmAssistEmbed', 'cultivationSecretRealmUI.js')(result)],
    components: ensureFunction(secretUI, 'buildSecretRealmAssistRows', 'cultivationSecretRealmUI.js')(ownerId, Boolean(result.pet)),
  });
}

async function handleSecretRealmFight(interaction, client, ownerId, guildId, userId, petAssist) {
  const [secret, secretUI] = await Promise.all([
    import('../../services/cultivationSecretRealm.js'),
    import('../../services/cultivationSecretRealmUI.js'),
  ]);

  const result = await ensureFunction(secret, 'fightSecretRealmMonster', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
    { petAssist },
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  if (!result.success) {
    return interaction.update({
      embeds: [ensureFunction(secretUI, 'buildSecretRealmFailEmbed', 'cultivationSecretRealmUI.js')(result)],
      components: ensureFunction(secretUI, 'buildSecretRealmBackRows', 'cultivationSecretRealmUI.js')(ownerId),
    });
  }

  return interaction.update({
    embeds: [ensureFunction(secretUI, 'buildSecretRealmWinEmbed', 'cultivationSecretRealmUI.js')(result)],
    components: ensureFunction(secretUI, 'buildSecretRealmWinRows', 'cultivationSecretRealmUI.js')(ownerId, result.completed),
  });
}

async function handleSecretRealmContinue(interaction, client, ownerId, guildId, userId) {
  const [secret, secretUI] = await Promise.all([
    import('../../services/cultivationSecretRealm.js'),
    import('../../services/cultivationSecretRealmUI.js'),
  ]);

  const continued = await ensureFunction(secret, 'continueSecretRealm', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
  );

  if (!continued.ok) {
    return showAdventureError(interaction, ownerId);
  }

  const result = await ensureFunction(secret, 'enterSecretRealmFloor', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(secretUI, 'buildSecretRealmFloorEmbed', 'cultivationSecretRealmUI.js')(result)],
    components: ensureFunction(secretUI, 'buildSecretRealmFloorRows', 'cultivationSecretRealmUI.js')(ownerId),
  });
}

async function handleSecretRealmLeave(interaction, client, ownerId, guildId, userId) {
  const [secret, secretUI] = await Promise.all([
    import('../../services/cultivationSecretRealm.js'),
    import('../../services/cultivationSecretRealmUI.js'),
  ]);

  const result = await ensureFunction(secret, 'leaveSecretRealm', 'cultivationSecretRealm.js')(
    client,
    guildId,
    userId,
  );

  if (!result.ok) {
    return showAdventureError(interaction, ownerId);
  }

  return interaction.update({
    embeds: [ensureFunction(secretUI, 'buildSecretRealmExitEmbed', 'cultivationSecretRealmUI.js')(result)],
    components: ensureFunction(secretUI, 'buildSecretRealmBackRows', 'cultivationSecretRealmUI.js')(ownerId),
  });
}

async function dispatchAction(interaction, client, ownerId, action, extra) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  switch (action) {
    case 'dashboard':
      return handleDashboard(interaction, client, ownerId, guildId, userId);
    case 'cultivate':
      return handleCultivate(interaction, client, ownerId, guildId, userId);
    case 'breakthrough':
      return handleBreakthrough(interaction, client, ownerId, guildId, userId);
    case 'inventory':
      return handleInventory(interaction, client, ownerId, guildId, userId);
    case 'use_item':
      return handleUseItem(interaction, client, ownerId, guildId, userId, extra);
    case 'alchemy':
      return handleAlchemy(interaction, client, ownerId, guildId, userId);
    case 'alchemy_make':
      return handleAlchemyMake(interaction, client, ownerId, guildId, userId, extra);
    case 'forge':
      return handleForge(interaction, client, ownerId, guildId, userId);
    case 'forge_make':
      return handleForgeMake(interaction, client, ownerId, guildId, userId, extra);
    case 'equipment':
      return handleEquipment(interaction, client, ownerId, guildId, userId);
    case 'technique':
      return handleTechnique(interaction, client, ownerId, guildId, userId);
    case 'technique_learn':
      return handleTechniqueLearn(interaction, client, ownerId, guildId, userId, extra);
    case 'treasure':
      return handleTreasure(interaction, client, ownerId, guildId, userId);
    case 'talisman_activate':
      return handleTalismanActivate(interaction, client, ownerId, guildId, userId, extra);
    case 'pet':
      return handlePet(interaction, client, ownerId, guildId, userId);
    case 'pet_capture':
      return handlePetCapture(interaction, client, ownerId, guildId, userId, extra);
    case 'profile':
      return handleProfile(interaction, client, ownerId, guildId, userId);
    case 'leaderboard':
      return handleLeaderboard(interaction, client, ownerId, guildId);
    case 'adventure':
      return handleAdventurePreview(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_start':
      return handleAdventureStart(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_choice':
      return handleAdventureChoice(interaction, client, ownerId, guildId, userId, extra);
    case 'adventure_v2_merchant_buy':
      return handleAdventureMerchantBuy(interaction, client, ownerId, guildId, userId, extra);
    case 'adventure_v2_merchant_leave':
      return handleAdventureMerchantLeave(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_pet_reveal':
      return handleAdventurePetReveal(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_pet_leave':
      return handleAdventurePetLeave(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_pet_capture':
      return handleAdventurePetCapture(interaction, client, ownerId, guildId, userId, extra);
    case 'adventure_v2_assist':
      return handleAdventureAssist(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_fight':
      return handleAdventureFight(interaction, client, ownerId, guildId, userId, false);
    case 'adventure_v2_fight_assist':
      return handleAdventureFight(interaction, client, ownerId, guildId, userId, true);
    case 'adventure_v2_retreat':
      return handleAdventureRetreat(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_comprehend':
      return handleAdventureComprehend(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_gate_open':
      return handleAdventureGateOpen(interaction, client, ownerId, guildId, userId);
    case 'adventure_v2_chest_inspect':
      return handleChestAction(interaction, client, ownerId, guildId, userId, 'inspect');
    case 'adventure_v2_chest_disarm':
      return handleChestAction(interaction, client, ownerId, guildId, userId, 'disarm');
    case 'adventure_v2_chest_open':
      return handleChestAction(interaction, client, ownerId, guildId, userId, 'open');
    case 'adventure_v2_chest_leave':
      return handleChestAction(interaction, client, ownerId, guildId, userId, 'leave');
    case 'secret_realm_enter':
      return handleSecretRealmEnter(interaction, client, ownerId, guildId, userId, extra);
    case 'secret_realm_assist':
      return handleSecretRealmAssist(interaction, client, ownerId, guildId, userId);
    case 'secret_realm_fight':
      return handleSecretRealmFight(interaction, client, ownerId, guildId, userId, false);
    case 'secret_realm_fight_assist':
      return handleSecretRealmFight(interaction, client, ownerId, guildId, userId, true);
    case 'secret_realm_continue':
      return handleSecretRealmContinue(interaction, client, ownerId, guildId, userId);
    case 'secret_realm_leave':
      return handleSecretRealmLeave(interaction, client, ownerId, guildId, userId);
    default:
      return replyEphemeral(interaction, 'Không tìm thấy hành động Tiên Lộ tương ứng.');
  }
}

export default {
  name: 'tutien_action',

  async execute(interaction, client, args = []) {
    const [ownerId, action, extra] = args;

    if (!ownerId || !action) {
      return;
    }

    try {
      if (await rejectWrongPlayer(interaction, ownerId)) {
        return;
      }

      if (!(await enforceChannel(interaction))) {
        return;
      }

      return await dispatchAction(
        interaction,
        client,
        ownerId,
        action,
        extra,
      );
    } catch (error) {
      return replySystemError(interaction, `Lỗi Tiên Lộ ở action ${action}`, error);
    }
  },
};
