import type { MayorReportResponse } from '../types/simulation';
import { fmt } from './format';

/**
 * Utilidades del decreto que comparten el modal y el PDF. El backend entrega cada
 * sección en un Markdown sencillo: un título "### ...", párrafos, listas "- ..."
 * y negritas o cursivas. Aquí se separa y se lee sin depender de una librería.
 */

export const ENGINE_LABEL: Record<MayorReportResponse['generated_by'], string> = {
  'heuristic-coe-fallback': 'Motor analítico del COE',
  'amazon-bedrock-nova-micro': 'Amazon Bedrock · Nova Micro',
  'amazon-bedrock-claude-haiku': 'Amazon Bedrock · Claude Haiku',
};

export const PRIORITY_LABEL: Record<string, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
};

export interface DecreeSection {
  title: string;
  body: string;
}

/** Las tres secciones del decreto, con su título (o uno por defecto si el texto no lo trae). */
export function decreeSections(report: MayorReportResponse): DecreeSection[] {
  return [
    splitHeading(report.situacion_critica, 'Considerando'),
    splitHeading(report.directivas_operativas, 'Decreta'),
    splitHeading(report.balance_recursos, 'Anexo: balance de recursos'),
  ];
}

/** Separa el primer "### Título" del resto del texto. */
export function splitHeading(markdown: string, fallback: string): DecreeSection {
  const match = markdown.trim().match(/^#{1,4}\s+(.+?)\s*(?:\n|$)([\s\S]*)$/);
  return match
    ? { title: match[1].trim(), body: match[2].trim() }
    : { title: fallback, body: markdown.trim() };
}

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'note'; text: string }
  | { kind: 'paragraph'; text: string };

/** Divide el texto en bloques separados por líneas en blanco. */
export function parseBlocks(markdown: string): Block[] {
  return markdown
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      const heading = chunk.match(/^#{1,4}\s+(.+)$/);
      if (heading) return { kind: 'heading', text: heading[1] };
      const lines = chunk.split('\n').map((l) => l.trim());
      if (lines.every((l) => /^[-*]\s+/.test(l))) {
        return { kind: 'bullets', items: lines.map((l) => l.replace(/^[-*]\s+/, '')) };
      }
      // Una línea entera en cursiva (*...*) es una nota al pie
      if (/^\*[^*][\s\S]*[^*]\*$/.test(chunk)) return { kind: 'note', text: chunk.slice(1, -1) };
      return { kind: 'paragraph', text: lines.join(' ') };
    });
}

export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Trozos de texto con su estilo: **negrita** y *cursiva*. */
export function parseInline(text: string): Span[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) return { text: part.slice(2, -2), bold: true };
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return { text: part.slice(1, -1), italic: true };
      return { text: part };
    });
}

/**
 * Número con formato, o "—" si falta. Un backend anterior (por ejemplo, la Lambda
 * aún sin redesplegar) no envía los indicadores nuevos y el decreto no debe romperse.
 */
export function fmtOrDash(value: number | null | undefined, decimals = 0): string {
  return typeof value === 'number' && Number.isFinite(value) ? fmt(value, decimals) : '—';
}

/** Cifra de la muestra llevada a habitantes de Manta, si se conoce la escala. */
export function toManta(sample: number | undefined, scale: number | undefined): number | undefined {
  return typeof sample === 'number' && typeof scale === 'number' ? sample * scale : undefined;
}

/** Fecha legible en español de Ecuador. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' });
}

/** El decreto completo en Markdown, para copiarlo. */
export function decreeMarkdown(report: MayorReportResponse): string {
  const m = report.metrics_snapshot;
  const engine = ENGINE_LABEL[report.generated_by] ?? report.generated_by;
  return [
    `# ${report.headline}`,
    '',
    `> Generado por: ${engine} · ${formatDate(report.created_at)}`,
    '',
    report.situacion_critica,
    '',
    report.directivas_operativas,
    '',
    report.balance_recursos,
    '',
    '## Indicadores clave',
    '',
    `- **Contagios evitados frente a no actuar:** ${fmtOrDash(m.lives_saved_vs_none)} en la muestra (unos ${fmtOrDash(toManta(m.lives_saved_vs_none, m.scale_factor))} habitantes de Manta)`,
    `- **Contagios evitados frente al azar:** ${fmtOrDash(m.lives_saved_vs_random)} en la muestra`,
    `- **Reducción del pico de zombies:** ${fmtOrDash(m.peak_reduction_pct, 1)}%`,
    `- **Costo por contagio evitado:** ${fmtOrDash(m.cost_per_infection_avoided_usd, 2)} $`,
    `- **Gasto:** ${fmtOrDash(m.budget_spent_usd)} $ en la muestra (unos ${fmtOrDash(m.budget_manta_equivalent_usd)} $ para toda Manta)`,
    `- **Parroquia con más contagios sin actuar:** ${m.most_critical_parish}`,
    '',
    '## Acciones prioritarias del COE',
    '',
    ...report.action_items.map(
      (a) => `- **[${PRIORITY_LABEL[a.priority] ?? a.priority}] ${a.title}:** ${a.description} _(${a.parish_or_hub})_`,
    ),
  ].join('\n');
}
