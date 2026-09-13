export const WIZARD_STRUCTURE_PROMPT_IDS = [
  'wizard:inicio:status',
  'wizard:inicio:crack',
  'wizard:desarrollo:inciting',
  'wizard:desarrollo:effect',
  'wizard:desarrollo:scenes',
  'wizard:climax:peak',
  'wizard:climax:now',
  'wizard:final:arrive',
  'wizard:final:change',
] as const

export type WizardStructurePromptId = (typeof WIZARD_STRUCTURE_PROMPT_IDS)[number]

const PROMPT_SET = new Set<string>(WIZARD_STRUCTURE_PROMPT_IDS)

export function isWizardStructurePromptId(id: string): id is WizardStructurePromptId {
  return PROMPT_SET.has(id)
}

export function allWizardStructurePromptsFilled(
  sections: { answers?: Record<string, string | undefined> }[] | undefined,
): boolean {
  if (!Array.isArray(sections)) return false
  return WIZARD_STRUCTURE_PROMPT_IDS.every((id) =>
    sections.some((section) => {
      const value = section.answers?.[id]
      return typeof value === 'string' && Boolean(value.trim())
    }),
  )
}

export function structureFillGuidance(): string {
  return `Treat each writing page as its own evidence unit. If a page has prose, use that page's complete excerpt; do not summarize the manuscript as only inicio/desarrollo/final while dropping page text.
When filling structure, prefer sections[].answers with these ids only:
wizard:inicio:status = ordinary world and who we meet before the story starts;
wizard:inicio:crack = what already feels unstable or incomplete;
wizard:desarrollo:inciting = the inciting incident: what unites the characters, starts the world turning, or breaks the status quo. If the manuscript already opened with an impactful event (news, rumor, secret), how it leaks in and takes control;
wizard:desarrollo:effect = how that incident affects the characters and how the plot starts developing;
wizard:desarrollo:scenes = key scenes in this section that can evolve later;
wizard:climax:peak = the peak moment and the plot twist that changes everything;
wizard:climax:now = when protagonists are in greatest danger and must act NOW, when order or mindsets break;
wizard:final:arrive = questions the ending should arrive at;
wizard:final:change = what the characters learned and what changed.
For desarrollo also set sections[].scenes: at most 6 {title<=80, form:"chapter"|"note"} from written evidence. Use chapter for narrative beats, note for world or research reminders. Base every answer on document excerpts; omit a key without evidence. content is optional.`
}
