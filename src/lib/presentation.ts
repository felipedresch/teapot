export function capitalizeFirst(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return `${trimmed.charAt(0).toLocaleUpperCase('pt-BR')}${trimmed.slice(1)}`
}

export function formatDatePtBrFromIso(value: string | undefined) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function getDisplayHostNames(hosts: Array<string>) {
  const cleanedHosts = hosts.map((host) => host.trim()).filter(Boolean)
  if (cleanedHosts.length === 0) return []

  const firstNameByHost: Record<string, string> = {}
  const firstNameCount: Record<string, number> = {}

  for (const host of cleanedHosts) {
    const [firstName = host] = host.split(/\s+/)
    const key = firstName.toLocaleLowerCase('pt-BR')
    firstNameByHost[host] = firstName
    firstNameCount[key] = (firstNameCount[key] ?? 0) + 1
  }

  return cleanedHosts.map((host) => {
    const firstName = firstNameByHost[host]
    const duplicateCount =
      firstNameCount[firstName.toLocaleLowerCase('pt-BR')] ?? 0

    if (duplicateCount <= 1) {
      return firstName
    }

    const parts = host.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].charAt(0).toLocaleUpperCase('pt-BR')}.`
    }

    return host
  })
}
