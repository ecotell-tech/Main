import { apiFetch } from '@services/api';

/**
 * Fetch the crop master catalog.
 * Returns [{ id, name, category, season, isActive, farmsCount }]
 */
export async function getCrops() {
  const data = await apiFetch('/master/crops');
  return data.map((c) => ({
    id:         c.id,
    name:       c.name,
    category:   c.category,
    season:     c.season,
    isActive:   c.is_active,
    farmsCount: c.farms_count,
  }));
}

/** @param {{ name: string, category?: string, season?: string }} crop */
export async function createCrop(crop) {
  const c = await apiFetch('/master/crops', {
    method: 'POST',
    body: JSON.stringify({ name: crop.name, category: crop.category || null, season: crop.season || null }),
  });
  return {
    id: c.id, name: c.name, category: c.category, season: c.season,
    isActive: c.is_active, farmsCount: c.farms_count,
  };
}

/** @param {number} id  @param {{ name?, category?, season?, isActive? }} patch */
export async function updateCrop(id, patch) {
  const body = {};
  if (patch.name !== undefined)      body.name = patch.name;
  if (patch.category !== undefined)  body.category = patch.category || null;
  if (patch.season !== undefined)    body.season = patch.season || null;
  if (patch.isActive !== undefined)  body.is_active = patch.isActive;

  const c = await apiFetch(`/master/crops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return {
    id: c.id, name: c.name, category: c.category, season: c.season,
    isActive: c.is_active, farmsCount: c.farms_count,
  };
}
