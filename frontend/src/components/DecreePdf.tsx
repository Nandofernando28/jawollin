import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { MayorReportResponse } from '../types/simulation';
import {
  fmtOrDash,
  ENGINE_LABEL,
  PRIORITY_LABEL,
  decreeSections,
  formatDate,
  parseBlocks,
  parseInline,
  type Block,
} from '../utils/decree';

/**
 * DecreePdf.tsx — Propuesta de Decreto en PDF oficial para el alcalde de Manta.
 *
 * Referencia oficial de diseño: Rules/Desing_MC.md
 * - §1 Principios: esquinas estrictamente rectas (borderRadius: 0)
 * - §2.1 Núcleo de color: off-black #171615, grey-6 #262423, grey-4 #6b6562, grey-1 #ede5e2
 * - §2.2 Verde Vanilla: green-5 #3c8527
 * - §2.4 Semánticos: warning #ca3636, focus/blue #1157be
 * - §3.4 Reglas de texto: mayúsculas con tracking en títulos institucionales
 */

// Sin guiones de corte automáticos: las reglas de la librería son para inglés
Font.registerHyphenationCallback((word) => [word]);

// Helvetica no trae el espacio fino (U+202F) que usa fmt para los miles: se cambia por un espacio normal
const pdfText = (text: string) => text.replace(/[  ]/g, ' ');
const fmt = (value: number | null | undefined, decimals = 0) => pdfText(fmtOrDash(value, decimals));

// Paleta oficial basada en Rules/Desing_MC.md (§2 Color y §1 Cero redondeo)
const C = {
  navy: '#171615', // Rules/Desing_MC.md §2.1: --mc-core-off-black
  ink: '#262423',  // Rules/Desing_MC.md §2.1: --mc-core-grey-6
  muted: '#6b6562',// Rules/Desing_MC.md §2.1: --mc-core-grey-4
  line: '#aba09c', // Rules/Desing_MC.md §2.1: --mc-core-grey-3
  panel: '#ede5e2',// Rules/Desing_MC.md §2.1: --mc-core-grey-1
  teal: '#3c8527', // Rules/Desing_MC.md §2.2: --mc-green-5
  orange: '#ffa41f', // Rules/Desing_MC.md §2.3: orange-4
  blue: '#1157be', // Rules/Desing_MC.md §2.4: --mc-default-focus
};

const PRIORITY_COLOR: Record<string, string> = {
  CRITICA: '#ca3636', // Rules/Desing_MC.md §2.4: default-warning
  ALTA: '#de5b0d',    // Rules/Desing_MC.md §2.3: orange-6
  MEDIA: '#94540e',   // Rules/Desing_MC.md §2.3: gold-6 (legible sobre fondo claro)
};

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 64,
    paddingHorizontal: 52,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: C.ink,
  },
  // Encabezado institucional
  band: { height: 6, backgroundColor: C.navy, borderBottomWidth: 2, borderBottomColor: C.teal, marginBottom: 18 },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.6, color: C.muted, textTransform: 'uppercase' },
  docType: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: C.navy, marginTop: 4 },
  headline: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.navy, marginTop: 10, lineHeight: 1.35 },
  meta: { fontSize: 8, color: C.muted, marginTop: 6 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 16 },
  // Indicadores
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, borderWidth: 2, borderColor: C.navy, backgroundColor: C.panel, borderRadius: 0, padding: 8 },
  kpiLabel: { fontSize: 6.5, letterSpacing: 1, color: C.muted, textTransform: 'uppercase' },
  kpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: C.navy, marginTop: 4 },
  kpiUnit: { fontSize: 7, color: C.muted, marginTop: 2 },
  // Secciones
  section: { marginTop: 18 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: C.navy,
    paddingBottom: 4,
    marginBottom: 8,
    borderBottomWidth: 1.5,
  },
  paragraph: { marginBottom: 7 },
  subheading: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.navy, marginTop: 4, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { width: 12, color: C.muted },
  bulletText: { flex: 1 },
  note: { fontSize: 8, fontFamily: 'Helvetica-Oblique', color: C.muted, marginTop: 2, marginBottom: 6 },
  bold: { fontFamily: 'Helvetica-Bold', color: C.navy },
  italic: { fontFamily: 'Helvetica-Oblique' },
  // Tabla de acciones
  tableHead: { flexDirection: 'row', backgroundColor: C.navy, color: '#ffffff', paddingVertical: 5, paddingHorizontal: 8 },
  tableHeadText: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#ffffff' },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  colPriority: { width: 62 },
  colAction: { flex: 1, paddingRight: 8 },
  colPlace: { width: 120 },
  priorityPill: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  actionTitle: { fontFamily: 'Helvetica-Bold', color: C.navy },
  actionDesc: { fontSize: 8.5, marginTop: 2 },
  // Firmas
  signatures: { flexDirection: 'row', gap: 40, marginTop: 44 },
  signature: { flex: 1, borderTopWidth: 1, borderTopColor: C.navy, paddingTop: 5 },
  signatureRole: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.navy },
  signatureHint: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  // Pie de página
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
    fontSize: 7,
    color: C.muted,
  },
});

const SECTION_COLORS = [C.orange, C.teal, C.blue];

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((span, i) => (
        <Text key={i} style={span.bold ? s.bold : span.italic ? s.italic : undefined}>
          {pdfText(span.text)}
        </Text>
      ))}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'heading':
      return <Text style={s.subheading}>{block.text}</Text>;
    case 'note':
      return <Text style={s.note}>{block.text}</Text>;
    case 'bullets':
      return (
        <View>
          {block.items.map((item, i) => (
            <View key={i} style={s.bulletRow} wrap={false}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={s.bulletText}><Inline text={item} /></Text>
            </View>
          ))}
        </View>
      );
    default:
      return <Text style={s.paragraph}><Inline text={block.text} /></Text>;
  }
}

export function DecreeDocument({ report }: { report: MayorReportResponse }) {
  const m = report.metrics_snapshot;
  const engine = ENGINE_LABEL[report.generated_by] ?? report.generated_by;
  const kpis = [
    { label: 'Contagios evitados', value: fmt(m.lives_saved_vs_none), unit: 'contagios menos frente a no actuar' },
    { label: 'Mejor que el azar', value: fmt(m.lives_saved_vs_random), unit: 'contagios menos frente al azar' },
    { label: 'Costo por contagio', value: `${fmt(m.cost_per_infection_avoided_usd, 2)} $`, unit: 'evitado frente a no actuar' },
    { label: 'Parroquia crítica', value: m.most_critical_parish, unit: 'más contagios sin actuar' },
  ];

  return (
    <Document
      title="Propuesta de Decreto de Emergencia - COE Cantonal de Manta"
      author="Operación Cortafuegos Manta"
      subject={report.headline}
      language="es-EC"
    >
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed />

        <Text style={s.eyebrow}>COE Cantonal · Alcaldía de San Pablo de Manta</Text>
        <Text style={s.docType}>Propuesta de Decreto de Emergencia</Text>
        <Text style={s.headline}>{report.headline}</Text>
        <Text style={s.meta}>
          {formatDate(report.created_at)} · Redactado por: {engine} · Código de reproducibilidad: {report.sim_hash}
        </Text>

        <View style={s.rule} />

        <View style={s.kpiRow} wrap={false}>
          {kpis.map((k) => (
            <View key={k.label} style={s.kpi}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={s.kpiValue}>{k.value}</Text>
              <Text style={s.kpiUnit}>{k.unit}</Text>
            </View>
          ))}
        </View>

        {decreeSections(report).map((section, i) => (
          <View key={section.title} style={s.section}>
            <Text style={[s.sectionTitle, { borderBottomColor: SECTION_COLORS[i] }]} minPresenceAhead={40}>
              {section.title}
            </Text>
            {parseBlocks(section.body).map((block, j) => <BlockView key={j} block={block} />)}
          </View>
        ))}

        {report.action_items.length > 0 && (
          <View style={s.section} wrap={false}>
            <Text style={[s.sectionTitle, { borderBottomColor: C.navy }]}>Acciones prioritarias del COE</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadText, s.colPriority]}>Prioridad</Text>
              <Text style={[s.tableHeadText, s.colAction]}>Acción</Text>
              <Text style={[s.tableHeadText, s.colPlace]}>Lugar</Text>
            </View>
            {report.action_items.map((a, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.priorityPill, s.colPriority, { color: PRIORITY_COLOR[a.priority] ?? C.muted }]}>
                  {PRIORITY_LABEL[a.priority] ?? a.priority}
                </Text>
                <View style={s.colAction}>
                  <Text style={s.actionTitle}>{a.title}</Text>
                  <Text style={s.actionDesc}>{a.description}</Text>
                </View>
                <Text style={[s.colPlace, { fontSize: 8.5 }]}>{a.parish_or_hub}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.signatures} wrap={false}>
          <View style={s.signature}>
            <Text style={s.signatureRole}>Alcaldía de Manta</Text>
            <Text style={s.signatureHint}>Firma y fecha de aprobación</Text>
          </View>
          <View style={s.signature}>
            <Text style={s.signatureRole}>Presidencia del COE Cantonal</Text>
            <Text style={s.signatureHint}>Firma y fecha de revisión</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Propuesta generada por simulación (Operación Cortafuegos Manta). No tiene valor legal sin aprobación.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Genera el PDF y lo descarga con un nombre que identifica la simulación. */
export async function downloadDecreePdf(report: MayorReportResponse): Promise<void> {
  const blob = await pdf(<DecreeDocument report={report} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Propuesta_Decreto_COE_Manta_${report.sim_hash.slice(0, 12)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después para que el navegador alcance a iniciar la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
