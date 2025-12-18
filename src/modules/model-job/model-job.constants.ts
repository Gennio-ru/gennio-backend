export const MODEL_JOB_CLIENT = "MODEL_JOB_CLIENT";

export const styleReferencePrompt = `Use the people from Image A and place them into the scene of Image B.
Identity lock: preserve each person’s identity from Image A with maximum fidelity (face geometry, proportions, age, expression, eyes/nose/lips/jawline, skin tone, unique features). Do not beautify or make faces generic.
Reference match: match Image B as closely as possible in composition, camera angle, poses, framing, perspective, background/environment, lighting direction/softness/contrast, color grading, mood and overall style.
Wardrobe & hair: adapt clothing, hairstyle and accessories to fit Image B if needed, but keep the people recognizable and natural. No logos, no text.
Realism: natural skin microtexture (pores, subtle imperfections), realistic hair, physically plausible shadows, no plastic look, no oversharpening.
Hands & anatomy: correct hands/fingers/teeth; avoid extra limbs and distortions.
Keep: same number of people as Image A; keep their relationships consistent and make their placement logical within Image B’s composition.
No artifacts: no watermark, no captions, no unintended objects, no gender/age changes, no identity swap.
Generate a high-quality final image: people from Image A, everything else matched to Image B.`;
