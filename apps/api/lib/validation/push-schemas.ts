import { z } from "zod"

export const pushTokenRegisterSchema = z.object({
  expoPushToken: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("ExponentPushToken[") ||
        value.startsWith("ExpoPushToken["),
      "Invalid Expo push token",
    ),
  platform: z.enum(["android", "ios", "web"]).optional(),
})

export const pushTokenUnregisterSchema = z.object({
  expoPushToken: z.string().trim().min(1),
})

export const customerPushTokenRegisterSchema = pushTokenRegisterSchema.extend({
  anonymousDeviceId: z.string().trim().min(1).optional(),
})

export const driverPushTokenRegisterSchema = pushTokenRegisterSchema.extend({
  anonymousDeviceId: z.string().trim().min(1).optional(),
})
