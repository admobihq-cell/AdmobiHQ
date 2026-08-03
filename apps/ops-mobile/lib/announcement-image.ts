import type { ImagePickerAsset } from "expo-image-picker"

// Push-friendly banner shape — matches the 2:1 frame most rich-notification
// and in-app card layouts expect.
export const ANNOUNCEMENT_IMAGE_WIDTH = 1200
export const ANNOUNCEMENT_IMAGE_HEIGHT = 600
export const ANNOUNCEMENT_IMAGE_ASPECT =
  ANNOUNCEMENT_IMAGE_WIDTH / ANNOUNCEMENT_IMAGE_HEIGHT

export type AnnouncementImage = { uri: string; width: number; height: number }

type ImageManipulatorModule = typeof import("expo-image-manipulator")

let cachedManipulator: ImageManipulatorModule | null | undefined

/**
 * `expo-image-manipulator` is a native module. Preview/production binaries built
 * before it was added will throw on import. Cache null so OTA updates stay safe
 * until a native rebuild ships.
 */
export function getImageManipulator(): ImageManipulatorModule | null {
  if (cachedManipulator !== undefined) return cachedManipulator
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module; static import crashes old binaries
    cachedManipulator = require("expo-image-manipulator") as ImageManipulatorModule
  } catch {
    cachedManipulator = null
  }
  return cachedManipulator
}

export function isAnnouncementImageCropAvailable(): boolean {
  return getImageManipulator() !== null
}

export async function prepareAnnouncementImage(
  asset: Pick<ImagePickerAsset, "uri" | "width" | "height">,
): Promise<AnnouncementImage> {
  const width = asset.width ?? 0
  const height = asset.height ?? 0
  const manipulator = getImageManipulator()

  if (!manipulator || width <= 0 || height <= 0) {
    return {
      uri: asset.uri,
      width: width || ANNOUNCEMENT_IMAGE_WIDTH,
      height: height || ANNOUNCEMENT_IMAGE_HEIGHT,
    }
  }

  const sourceAspect = width / height
  const cropRect =
    sourceAspect > ANNOUNCEMENT_IMAGE_ASPECT
      ? {
          originX: (width - height * ANNOUNCEMENT_IMAGE_ASPECT) / 2,
          originY: 0,
          width: height * ANNOUNCEMENT_IMAGE_ASPECT,
          height,
        }
      : {
          originX: 0,
          originY: (height - width / ANNOUNCEMENT_IMAGE_ASPECT) / 2,
          width,
          height: width / ANNOUNCEMENT_IMAGE_ASPECT,
        }

  const rendered = await manipulator.ImageManipulator.manipulate(asset.uri)
    .crop(cropRect)
    .resize({ width: ANNOUNCEMENT_IMAGE_WIDTH, height: ANNOUNCEMENT_IMAGE_HEIGHT })
    .renderAsync()
  const saved = await rendered.saveAsync({
    format: manipulator.SaveFormat.JPEG,
    compress: 0.85,
  })
  return { uri: saved.uri, width: saved.width, height: saved.height }
}
