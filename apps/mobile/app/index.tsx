import { Redirect } from "expo-router"

import { LoadingScreen } from "@/components/LoadingScreen"

export default function Index() {
  return (
    <>
      <LoadingScreen />
      <Redirect href="/sign-in" />
    </>
  )
}
