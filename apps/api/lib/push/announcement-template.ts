export type AnnouncementTemplateVars = {
  firstName?: string
  orgName?: string
}

/**
 * Substitute `{{first_name}}` / `{{org_name}}`. Missing values strip the tag and
 * tidy common authoring leftovers ("Hi , …" → "Hi, …"; leading orphan commas).
 */
export function renderAnnouncementTemplate(
  template: string,
  vars: AnnouncementTemplateVars = {},
): string {
  return template
    .replace(/\{\{\s*first_name\s*\}\}/g, vars.firstName ?? "")
    .replace(/\{\{\s*org_name\s*\}\}/g, vars.orgName ?? "")
    .replace(/ {2,}/g, " ")
    .replace(/ +([,.!?;:])/g, "$1")
    .replace(/^[,;:]\s*/, "")
    .trim()
}
