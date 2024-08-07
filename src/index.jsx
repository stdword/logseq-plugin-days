import "@logseq/libs"
import { addHours, setDefaultOptions } from "date-fns"
import {
  af as locale_Af,
  de as locale_De,
  enUS as locale_EnUS,
  es as locale_Es,
  faIR as locale_FaIR,
  fr as locale_Fr,
  id as locale_Id,
  it as locale_It,
  ja as locale_Ja,
  ko as locale_Ko,
  nb as locale_Nb,
  nl as locale_Nl,
  pl as locale_Pl,
  pt as locale_Pt,
  ptBR as locale_PtBR,
  ru as locale_Ru,
  sk as locale_Sk,
  tr as locale_Tr,
  uk as locale_Uk,
  zhCN as locale_ZhCN,
  zhTW as locale_ZhTW,
} from "date-fns/locale"
import { waitMs } from "jsutils"
import { setup, t } from "logseq-l10n"
import { render } from "preact"
import Calendar from "./comps/Calendar"
import Year from "./comps/Year"
import { getEventsToSync } from "./libs/query"
import {
  parseContent,
  parseScheduledDate,
  persistBlockUUID,
} from "./libs/utils"
import zhCN from "./translations/zh-CN.json"

const routeOffHooks = {}

const DYNAMIC = "*"
const CUSTOM = "@"

const TB_ICON = `<svg t="1675670224876" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1511" width="200" height="200"><path d="M896 384H128c-17.6 0-32-14.4-32-32s14.4-32 32-32h768c17.6 0 32 14.4 32 32s-14.4 32-32 32z" p-id="1512"></path><path d="M832 928H192c-52.8 0-96-43.2-96-96V224c0-52.8 43.2-96 96-96 17.6 0 32 14.4 32 32s-14.4 32-32 32-32 14.4-32 32v608c0 17.6 14.4 32 32 32h640c17.6 0 32-14.4 32-32V224c0-17.6-14.4-32-32-32s-32-14.4-32-32 14.4-32 32-32c52.8 0 96 43.2 96 96v608c0 52.8-43.2 96-96 96z" p-id="1513"></path><path d="M320 224c-17.6 0-32-14.4-32-32V128c0-17.6 14.4-32 32-32s32 14.4 32 32v64c0 17.6-14.4 32-32 32zM576 192h-128c-17.6 0-32-14.4-32-32s14.4-32 32-32h128c17.6 0 32 14.4 32 32s-14.4 32-32 32zM704 224c-17.6 0-32-14.4-32-32V128c0-17.6 14.4-32 32-32s32 14.4 32 32v64c0 17.6-14.4 32-32 32z" p-id="1514"></path></svg>`
const SIDEBAR_CONTENTS_SELECTOR = ".sidebar-item #contents"

let weekStart,
  weekFormat,
  weekPageTemplate,
  locale,
  preferredLanguage,
  preferredDateFormat

const logseqLocalesMap = {
  // key: logseq language available in UI
  // value: date-fns locale object
  en: locale_EnUS,
  fr: locale_Fr,
  de: locale_De,
  nl: locale_Nl,
  "zh-CN": locale_ZhCN,
  "zh-Hant": locale_ZhTW,
  af: locale_Af,
  es: locale_Es,
  "nb-NO": locale_Nb,
  pl: locale_Pl,
  "pt-BR": locale_PtBR,
  "pt-PT": locale_Pt,
  ru: locale_Ru,
  ja: locale_Ja,
  it: locale_It,
  tr: locale_Tr,
  uk: locale_Uk,
  ko: locale_Ko,
  sk: locale_Sk,
  fa: locale_FaIR,
  id: locale_Id,
}

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  provideStyles()

  logseq.useSettingsSchema([
    {
      key: "dateFormat",
      type: "string",
      default: "",
      description: t("Leave this empty to use Logseq's date format."),
    },
    {
      key: "weekPageFormat",
      type: "string",
      default: "yyyy-'W'w",
      description: t(
        "Characters inside single quotes '...' will be left intact. Use `ww` pattern instead of `w` to add leading zero for week numbers. Leave empty to disable week pages. (default: `yyyy-'W'w`)",
      ),
    },
    {
      key: "weekPageTemplate",
      type: "string",
      description: t("Template name to use for new or empty weekly pages"),
    },
    {
      key: "firstWeekContainsDate",
      type: "number",
      default: locale === locale_ZhCN ? 4 : 1,
      description: t(
        "The first week of the year must contain the specified date. Consult your local standard. To use ISO 8601 (first Thursday should be in the first week), set it to 4.",
      ),
    },
    {
      key: "displayScheduledAndDeadline",
      type: "boolean",
      default: true,
      description: t(
        "Controls whether you want to display Scheduled and Deadlines on the calendar.",
      ),
    },
    {
      key: "scheduledColor",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Color for Scheduled."),
    },
    {
      key: "deadlineColor",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Color for Deadline."),
    },
    {
      key: "property1",
      type: "heading",
      title: t("Property 1"),
    },
    {
      key: "name1",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color1",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat1",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount1",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt1",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property2",
      type: "heading",
      title: t("Property 2"),
    },
    {
      key: "name2",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color2",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat2",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount2",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt2",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property3",
      type: "heading",
      title: t("Property 3"),
    },
    {
      key: "name3",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color3",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat3",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount3",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt3",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property4",
      type: "heading",
      title: t("Property 4"),
    },
    {
      key: "name4",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color4",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat4",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount4",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt4",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property5",
      type: "heading",
      title: t("Property 5"),
    },
    {
      key: "name5",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color5",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat5",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount5",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt5",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property6",
      type: "heading",
      title: t("Property 6"),
    },
    {
      key: "name6",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color6",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat6",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount6",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt6",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property7",
      type: "heading",
      title: t("Property 7"),
    },
    {
      key: "name7",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color7",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat7",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount7",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt7",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property8",
      type: "heading",
      title: t("Property 8"),
    },
    {
      key: "name8",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color8",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat8",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount8",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt8",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property9",
      type: "heading",
      title: t("Property 9"),
    },
    {
      key: "name9",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color9",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat9",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount9",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt9",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property10",
      type: "heading",
      title: t("Property 10"),
    },
    {
      key: "name10",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color10",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat10",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount10",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt10",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property11",
      type: "heading",
      title: t("Property 11"),
    },
    {
      key: "name11",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color11",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat11",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount11",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt11",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property12",
      type: "heading",
      title: t("Property 12"),
    },
    {
      key: "name12",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color12",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat12",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount12",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt12",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property13",
      type: "heading",
      title: t("Property 13"),
    },
    {
      key: "name13",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color13",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat13",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount13",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt13",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property14",
      type: "heading",
      title: t("Property 14"),
    },
    {
      key: "name14",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color14",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat14",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount14",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt14",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
    {
      key: "property15",
      type: "heading",
      title: t("Property 15"),
    },
    {
      key: "name15",
      type: "string",
      default: "",
      description: t("Name of the property containing a date as value."),
    },
    {
      key: "color15",
      type: "string",
      inputAs: "color",
      default: "#ffa500",
      description: t("Highlight color."),
    },
    {
      key: "repeat15",
      type: "string",
      default: "",
      description: t(
        "Repeat interval in days (d), weeks (w), months (m) or years (y), e.g, 2w. Leave it empty if not repeated.",
      ),
    },
    {
      key: "repeatCount15",
      type: "number",
      default: -1,
      description: t(
        "End the repeat after the specified times. -1 means to repeat endlessly.",
      ),
    },
    {
      key: "repeatEndAt15",
      type: "string",
      inputAs: "date",
      default: "",
      description: t("End the repeat at the specified date."),
    },
  ])

  const graphChangeHook = logseq.App.onCurrentGraphChanged(refreshConfigs)
  const settingsOffHook = logseq.onSettingsChanged(refreshConfigs)

  logseq.App.onMacroRendererSlotted(daysRenderer)
  logseq.App.onMacroRendererSlotted(yearRenderer)

  logseq.Editor.registerSlashCommand("Days", async () => {
    await logseq.Editor.insertAtEditingCursor("{{renderer :days, *}}")
    // const input = parent.document.activeElement
    // const pos = input.selectionStart - 2
    // input.setSelectionRange(pos, pos)
  })

  logseq.Editor.registerSlashCommand("Days (Year View)", async () => {
    await logseq.Editor.insertAtEditingCursor("{{renderer :days-year, *}}")
    // const input = parent.document.activeElement
    // const pos = input.selectionStart - 2
    // input.setSelectionRange(pos, pos)
  })

  logseq.App.registerPageMenuItem(t("Open Days"), async ({ page }) =>
    openPageDays(page),
  )
  logseq.App.registerUIItem("toolbar", {
    key: t("open-days"),
    template: `<a class="kef-days-tb-icon" data-on-click="openDays" title="${t(
      "Open Days",
    )}">${TB_ICON}</a>`,
  })

  logseq.beforeunload(() => {
    settingsOffHook()
    graphChangeHook()
    for (const off of Object.values(routeOffHooks)) {
      off?.()
    }
  })

  console.log("#days loaded")
}

async function refreshConfigs() {
  const configs = await logseq.App.getUserConfigs()
  weekStart = (+(configs.preferredStartOfWeek ?? 6) + 1) % 7
  locale = logseqLocalesMap[configs.preferredLanguage] || locale_EnUS
  preferredDateFormat =
    logseq.settings?.dateFormat?.trim() || configs.preferredDateFormat
  weekFormat = logseq.settings?.weekPageFormat?.trim()
  weekPageTemplate = logseq.settings?.weekPageTemplate?.trim()
  setDefaultOptions({
    locale: locale,
    weekStartsOn: weekStart,
    firstWeekContainsDate: logseq.settings?.firstWeekContainsDate ?? 1,
  })
}

function daysRenderer({ slot, payload: { arguments: args, uuid } }) {
  const [type] = args
  if (type.trim() !== ":days") return

  const slotEl = parent.document.getElementById(slot)
  if (!slotEl) return
  const renderered = slotEl.childElementCount > 0
  if (renderered) return

  const q = args[1]?.trim()
  const withAll = args[2]?.trim() === "all"
  let year = Number(args[3]?.trim())
  if (Number.isNaN(year)) year = new Date().getFullYear()
  let month = Number(args[4]?.trim())
  if (Number.isNaN(month)) month = new Date().getMonth()
  else month = Math.min(12, Math.max(1, month)) - 1
  const id = `kef-days-${slot}`

  logseq.provideUI({
    key: `days-${slot}`,
    slot,
    template: `<div id="${id}"></div>`,
    reset: true,
    style: {
      cursor: "default",
    },
  })

  // Let div root element get generated first.
  setTimeout(async () => {
    if (q === DYNAMIC) {
      observeRoute(uuid, id, type, year, month)
      const name = await getCurrentPageName()
      await renderCalendar(uuid, id, name, true, year, month, false, true)
    } else if (q === CUSTOM) {
      const block = await logseq.Editor.getBlock(uuid, {
        includeChildren: true,
      })
      const lines = block.children[0]?.content?.split("\n")
      const query = lines
        ?.filter((_, i) => i > 0 && i < lines.length - 1)
        .join("\n")
      if (query) {
        await renderCalendar(uuid, id, query, withAll, year, month, true)
      } else {
        await renderCalendar(uuid, id, null, true, year, month)
      }
    } else {
      await renderCalendar(
        uuid,
        id,
        q.startsWith("[[") || q.startsWith("((")
          ? q.substring(2, q.length - 2)
          : q,
        withAll,
        year,
        month,
      )
    }
  }, 0)
}

function observeRoute(uuid, id, renderer, year, month) {
  if (routeOffHooks[id] == null) {
    routeOffHooks[id] = logseq.App.onRouteChanged(
      async ({ path, template }) => {
        const rootEl = parent.document.getElementById(id)
        if (rootEl == null || !rootEl.isConnected) {
          routeOffHooks[id]?.()
          routeOffHooks[id] = undefined
          return
        }

        if (template === "/page/:name") {
          const name = decodeURIComponent(
            path.substring("/page/".length).toLowerCase(),
          )
          if (renderer === ":days-year") {
            await renderYearView(id, name, year, uuid)
          } else {
            await renderCalendar(uuid, id, name, true, year, month, false, true)
          }
        } else if (renderer !== ":days-year") {
          await renderCalendar(uuid, id, null, true, year, month, false, true)
        }
      },
    )
  }
}

async function getCurrentPageName() {
  let page = await logseq.Editor.getCurrentPage()
  if (page?.page != null) {
    page = await logseq.Editor.getPage(page.page.id)
  }
  return page?.name
}

async function renderCalendar(
  uuid,
  id,
  q,
  withAll = false,
  year = undefined,
  month = undefined,
  isCustom = false,
  withJournal = false,
) {
  const el = parent.document.getElementById(id)
  if (el == null) return

  render(
    <Calendar
      uuid={uuid}
      query={q}
      withAll={withAll}
      startingYear={year}
      startingMonth={month}
      isCustom={isCustom}
      withJournal={withJournal}
      weekStart={weekStart}
      locale={locale}
      dateFormat={preferredDateFormat}
      weekFormat={weekFormat}
      weekTemplate={weekPageTemplate}
    />,
    el,
  )
}

function yearRenderer({ slot, payload: { arguments: args, uuid } }) {
  const [type] = args
  if (type.trim() !== ":days-year") return

  const slotEl = parent.document.getElementById(slot)
  if (!slotEl) return
  const renderered = slotEl.childElementCount > 0
  if (renderered) return

  const q = args[1]?.trim()
  const year = +(args[2]?.trim() ?? new Date().getFullYear())
  const title = args[3]?.trim()
  const id = `kef-days-${slot}`

  if (!q || !year) return

  slotEl.style.width = "100%"

  logseq.provideUI({
    key: `days-year-${slot}`,
    slot,
    template: `<div id="${id}" class="kef-days-yearview-slot"></div>`,
    reset: true,
    style: {
      cursor: "default",
      width: "100%",
    },
  })

  // Let div root element get generated first.
  setTimeout(async () => {
    if (q === DYNAMIC) {
      observeRoute(uuid, id, type, year)
      const name = await getCurrentPageName()
      await renderYearView(id, name, year, uuid)
    } else if (q === CUSTOM) {
      const block = await logseq.Editor.getBlock(uuid, {
        includeChildren: true,
      })
      const lines = block.children[0]?.content?.split("\n")
      const query = lines
        ?.filter((_, i) => i > 0 && i < lines.length - 1)
        .join("\n")
      if (query) {
        await renderYearView(id, query, year, uuid, title, true)
      } else {
        await renderYearView(id, null, year, uuid, title, true)
      }
    } else {
      await renderYearView(
        id,
        q.startsWith("[[") || q.startsWith("((")
          ? q.substring(2, q.length - 2)
          : q,
        year,
        uuid,
      )
    }
  }, 0)
}

async function renderYearView(id, q, year, uuid, title, isCustom = false) {
  const el = parent.document.getElementById(id)
  if (el == null) return

  render(
    <Year
      q={q}
      userTitle={title}
      isCustom={isCustom}
      startingYear={year}
      weekStart={weekStart}
      locale={locale}
      dateFormat={preferredDateFormat}
      uuid={uuid}
    />,
    el,
  )
}

function provideStyles() {
  logseq.provideStyle({
    key: "kef-days",
    style: `
    .kef-days-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
    }
    .kef-days-date {
      flex: 0 0 auto;
      font-size: 1.25em;
      font-weight: 500;
      line-height: 2;
    }
    .kef-days-dateinput {
      flex: 0 0 auto;
      display: flex;
      margin-right: 8px;
    }
    .kef-days-dateinput-input {
      height: 30px;
      width: 130px;
      padding: 2px;
      margin: 5px 2px 5px 0;
    }
    .kef-days-dateinput-btn:hover {
      color: var(--ls-active-primary-color);
    }
    .kef-days-span {
      flex: 1;
    }
    .kef-days-controls {
      flex: 0 0 auto;
      font-size: 0.9375em;
      display: flex;
      align-items: center;
    }
    .kef-days-control-icon {
      height: 24px;
      padding: 4px 0;
      color: var(--ls-primary-text-color);
    }
    .kef-days-control-icon:hover {
      color: var(--ls-active-primary-color);
    }
    .kef-days-refresh {
      margin-right: 6px;
      padding: 5px 0;
    }
    .kef-days-go-today {
      line-height: 24px;
      height: 24px;
    }
    .kef-days-go-today:hover {
      color: var(--ls-active-primary-color);
    }
    .kef-days-month-view {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: auto;
      grid-auto-rows: auto;
      gap: 7px;
      font-size: 0.875em;
      padding-left: 30px;
    }
    .kef-days-weekday {
      text-align: center;
      opacity: 0.85;
    }
    .kef-days-weekend {
      color: var(--ls-active-secondary-color);
    }
    .kef-days-day {
      display: flex;
      position: relative;
      flex-flow: column nowrap;
      align-items: center;
      width: 36px;
      min-height: 36px;
    }
    .kef-days-weeknum {
      aspect-ratio: 1;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: -25px;
      width: 27px;
      height: 27px;
      line-height: 27px;
      font-size: 0.75em;
      opacity: 0.5;
      text-align: center;
    }
    .kef-days-weeknum.kef-days-clickable {
      cursor: pointer;
    }
    .kef-days-weeknum.kef-days-clickable:hover {
      background-color: var(--ls-quaternary-background-color);
    }
    .kef-days-num {
      width: 30px;
      aspect-ratio: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      user-select: none;
    }
    .kef-days-num:hover {
      background-color: var(--ls-quaternary-background-color);
    }
    .kef-days-highlight {
      font-weight: 600;
    }
    .kef-days-today {
      color: var(--ls-selection-text-color);
      background-color: var(--ls-selection-background-color);
    }
    .kef-days-today:hover {
      color: var(--ls-selection-text-color);
      background-color: var(--ls-selection-background-color);
    }
    .kef-days-current {
      color: #fff;
      background-color: var(--ls-active-secondary-color);
    }
    .kef-days-current:hover {
      color: #fff;
      background-color: var(--ls-active-secondary-color);
    }
    .kef-days-contentful {
      width: 8px;
      height: 2px;
      background: var(--ls-success-text-color);
      position: absolute;
      top: 3px;
    }
    .kef-days-has-task {
      position: absolute;
      top: 0;
      right: 2px;
      width: 1px;
      height: 4px;
      background: var(--ls-active-secondary-color);
      border-radius: 50%;
      transform: rotate(45deg);
    }
    .kef-days-referred {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: var(--ls-active-primary-color);
      position: absolute;
      bottom: 2px;
    }
    .kef-days-prop {
      position: relative;
      width: 100%;
      font-size: 0.8em;
      cursor: pointer;
      margin-bottom: 1px;
    }
    .kef-days-prop-placeholder {
      display: none;
    }
    .kef-days-prop-text {
      padding: 0 2px;
      border-radius: 2px;
      overflow: hidden;
      white-space: nowrap;
    }
    .kef-days-prop:hover .kef-days-prop-placeholder {
      display: inline;
    }
    .kef-days-prop:hover .kef-days-prop-text {
      overflow: initial;
      white-space: initial;
      width: max-content;
      max-width: 200px;
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: var(--ls-z-index-level-1);
      text-align: left;
      box-shadow: 0 0 6px 0;
    }
    .kef-days-outside {
      opacity: 0.35;
    }
    .kef-days-yearview-slot {
      width: 100%;
    }
    .kef-days-yearview {
      display: grid;
      grid-template-rows: repeat(8, auto);
      grid-template-columns: auto;
      grid-auto-flow: column;
      gap: 3px;
      width: 100%;
      overflow-x: auto;
    }
    .kef-days-yearview-day {
      width: 11px;
      height: 11px;
      border: 1px solid: var(--ls-border-color);
      border-radius: 2px;
      background-color: var(--ls-tertiary-background-color);
      cursor: pointer;
    }
    .kef-days-yearview-month {
      grid-row: 1;
      font-size: 0.875em;
    }
    .kef-days-yearview-header {
      display: flex;
      align-items: center;
    }
    .kef-days-yearview-title {
      flex: 1;
      text-align: center;
    }
    .kef-days-yearview-controls {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
    }
    .kef-days-control-edit {
      flex: 0 0 auto;
      font-family: "tabler-icons";
      line-height: 24px;
      padding: 0;
      margin-left: 0.5em;
    }

    .kef-days-tb-icon {
      display: flex;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      justify-content: center;
      align-items: center;
      color: var(--ls-header-button-background);
    }
    .kef-days-tb-icon svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
    .kef-days-tb-icon:hover {
      background: var(--ls-tertiary-background-color);
    }
    `,
  })
}

async function openPageDays(pageName) {
  await logseq.Editor.appendBlockInPage(
    "contents",
    `{{renderer :days, [[${pageName}]]}}`,
  )
  // HACK: exitEditingMode does not work if called immediately after appending.
  await waitMs(50)
  await logseq.Editor.exitEditingMode()

  // Open contents in sidebar if not already opened.
  let contentsEl = parent.document.querySelector(SIDEBAR_CONTENTS_SELECTOR)
  if (contentsEl == null) {
    const contentsPage = await logseq.Editor.getPage("contents")
    logseq.Editor.openInRightSidebar(contentsPage.uuid)
  }
}

const model = {
  async openDays() {
    const pageName = await getCurrentPageName()
    if (pageName) {
      openPageDays(pageName)
    } else {
      logseq.UI.showMsg(t("No page detected.", "warn"))
    }
  },

  async eventsToSync(from, to) {
    from = new Date(from)
    to = new Date(to)

    const lsEvents = await getEventsToSync(from, to)

    const ret = {}

    for (const { uuid, content } of lsEvents) {
      const [from, allDay, repeat] = parseScheduledDate(content)
      const title = await parseContent(content)
      await persistBlockUUID(uuid)
      ret[uuid] = {
        title,
        from: from.toJSON(),
        to: addHours(from, 1).toJSON(),
        allDay,
      }
    }

    return ret
  },
}

logseq.ready(model, main).catch(console.error)
