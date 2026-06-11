import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mapa TLA (football-data.org / FIFA) → ISO 3166-1 alpha-2 (flagcdn.com)
const TLA_TO_ALPHA2: Record<string, string> = {
  ALG:'dz', ARG:'ar', AUS:'au', AUT:'at', BEL:'be', BIH:'ba', BRA:'br',
  CAN:'ca', CIV:'ci', COD:'cd', COL:'co', CPV:'cv', CRO:'hr', CUW:'cw',
  CZE:'cz', ECU:'ec', EGY:'eg', ENG:'gb-eng', ESP:'es', FRA:'fr', GER:'de',
  GHA:'gh', HAI:'ht', IRN:'ir', IRQ:'iq', JOR:'jo', JPN:'jp', KOR:'kr',
  KSA:'sa', MAR:'ma', MEX:'mx', NED:'nl', NOR:'no', NZL:'nz', PAN:'pa',
  PAR:'py', POR:'pt', QAT:'qa', RSA:'za', SCO:'gb-sct', SEN:'sn', SUI:'ch',
  SWE:'se', TUN:'tn', TUR:'tr', URY:'uy', USA:'us', UZB:'uz',
}

/** URL de bandera — acepta TLA de football-data.org ('MEX') o ISO alpha-2 ('mx') */
export function getFlagUrl(teamCode: string, size: '32x24' | '64x48' | '160x120' = '64x48') {
  const upper = teamCode.toUpperCase()
  const alpha2 = TLA_TO_ALPHA2[upper] ?? teamCode.toLowerCase()
  return `https://flagcdn.com/${size}/${alpha2}.png`
}

/** Formatea un kickoff ISO a "Vie 12 Jun · 18:00" */
export function formatKickoff(iso: string): string {
  return format(parseISO(iso), "EEE d MMM · HH:mm", { locale: es })
}

/** Versión corta: "12 Jun" */
export function formatShortDate(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: es })
}

/** Tiempo relativo: "en 2 horas", "hace 3 días" */
export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es })
}

/** Capitaliza la primera letra */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Obtiene las iniciales de un nombre (máx. 2 caracteres) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Descripción textual del puntaje base */
export function getScoreLabel(base: number): string {
  const labels: Record<number, string> = {
    4: 'Marcador exacto',
    3: 'Misma diferencia y ganador',
    2: 'Mismo ganador',
    1: 'Misma diferencia',
    0: 'Sin puntos',
  }
  return labels[base] ?? 'Desconocido'
}

/** Descripción textual del bonus de clave de gol */
export function getBonusLabels(bonus: {
  goal?: boolean
  penalty?: boolean
  assist?: boolean
  motm?: boolean
}): string[] {
  const parts: string[] = []
  if (bonus.goal)    parts.push('+3 Gol')
  if (bonus.penalty) parts.push('+2 Penal')
  if (bonus.assist)  parts.push('+1 Asistencia')
  if (bonus.motm)    parts.push('+1 MOTM')
  return parts
}
