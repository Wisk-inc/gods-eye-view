// Section manifest. Ranges are exclusive [start, end) in reference frames, must tile 0..658 without overlap,
// and are authoritative (a section module only supplies build()).
export const MANIFEST = [
  { id: 'A', file: 'a_ink.js', range: [0, 21], name: 'ink burst' },
  { id: 'B', file: 'b_redglow.js', range: [21, 48], name: 'red glow' },
  { id: 'C', file: 'c_pillars.js', range: [48, 78], name: 'pillars, panels, white iris' },
  { id: 'D', file: 'd_orbit.js', range: [78, 118], name: 'orbit' },
  { id: 'E', file: 'e_maroon.js', range: [118, 160], name: 'maroon cards' },
  { id: 'F', file: 'f_starburst.js', range: [160, 241], name: 'starburst' },
  { id: 'G', file: 'g_mono.js', range: [241, 267], name: 'mono' },
  { id: 'H', file: 'h_interlude.js', range: [267, 316], name: 'shutter interlude' },
  { id: 'I', file: 'i_wide.js', range: [316, 367], name: 'wide line' },
  { id: 'J', file: 'j_steel.js', range: [367, 525], name: 'steel particles' },
  { id: 'K', file: 'k_outro.js', range: [525, 658], name: 'outro' },
];

/** Dynamically import the requested sections; a broken or missing module never takes the others down. */
export async function loadSections(only) {
  const out = [];
  for (const m of MANIFEST) {
    if (only && !only.includes(m.id)) continue;
    try { const mod = await import('./' + m.file); out.push({ ...mod.default, ...m }); } catch (e) { out.push({ ...m, error: String((e && e.stack) || e) }); }
  }
  return out;
}
