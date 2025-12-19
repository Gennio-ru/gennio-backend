export const MODEL_JOB_CLIENT = "MODEL_JOB_CLIENT";

export const styleReferencePrompt = `Use the identity from the first image and generate a new image in the style of the second image.
Recreate the scene as a new shot, not a direct edit.
The body, pose, and full geometry should follow the second image.
Reconstruction is allowed to the extent necessary to match the pose and emotions of the scene.
The face should be synthesized from scratch and must not inherit facial proportions from the second image.
`;

// export const styleReferencePrompt = `Use the identity from the first image and generate a new image in the style of the second image.
// Recreate the scene as a new shot, not a direct edit.
// The body, pose, and full geometry should follow the second image.
// Reconstruction is allowed to the extent necessary to match the pose and emotions of the scene.
// The face should be synthesized from scratch and must not inherit facial proportions from the second image.

// Keep the person highly recognizable from the first image: match key facial traits (eyes, eyebrows, nose, lips, jawline), skin tone, and any distinctive features (glasses, beard, scars, etc.) without beautifying or making the face generic.
// Do not blend identities or mix faces between people; each person must match their counterpart from the first image.
// `;

// export const styleReferencePrompt = `Use the identity of the person or people from the first image and generate a new image in the style of the second image. Recreate the scene as a new shot, not a direct edit. Full changes to facial geometry are allowed to naturally match the pose, perspective, and emotions of the scene.`;
