export const IMAGE_MAX_BYTES = 7_000_000;
export const IMAGE_TURN_MAX_BYTES = 20_000_000;
export const IMAGE_MAX_COUNT = 12;
export const isImageName = (name: string) => /\.(png|jpe?g|webp)$/i.test(name);
export const isImageMedia = (type?: string | null): type is 'image/png' | 'image/jpeg' | 'image/webp' =>
  type === 'image/png' || type === 'image/jpeg' || type === 'image/webp';
