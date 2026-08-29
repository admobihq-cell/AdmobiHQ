import assert from "node:assert/strict"
import test from "node:test"

import { isProbePath } from "../apps/web/lib/seo/bot-probes.ts"

test("real marketing routes are not probes", () => {
  for (const path of ["/", "/pricing", "/help", "/help/contact", "/blog", "/partner-fleet", "/admin", "/admin/login"]) {
    assert.equal(isProbePath(path), false, path)
  }
})

test("scanner contact-form aliases are probes", () => {
  for (const path of ["/contacto", "/contatti", "/kontakt", "/impressum", "/reach-us", "/about-us"]) {
    assert.equal(isProbePath(path), true, path)
  }
})

test("wordpress and env probes are blocked including nested paths", () => {
  assert.equal(isProbePath("/wp-admin/install.php"), true)
  assert.equal(isProbePath("/.env"), true)
  assert.equal(isProbePath("/.git/config"), true)
  assert.equal(isProbePath("/xmlrpc.php"), true)
})
