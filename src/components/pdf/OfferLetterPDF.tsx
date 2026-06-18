import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: 'Inter', fontSize: 11 },
  header: { fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 30, textAlign: 'center' },
  section: { marginBottom: 16 },
  label: { fontWeight: 700, fontSize: 12, marginBottom: 6, borderBottom: '1px solid #ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  col: { flex: 1 },
  bold: { fontWeight: 700 },
  signature: { marginTop: 60 },
  line: { borderTop: '1px solid #000', width: 200, marginTop: 40 },
})

import { OfferLetterData } from '../../types/models'

export interface OfferLetterLabels {
  offerTitle: string
  parties: string
  offerMadeBy: string
  offerTo: string
  position: string
  title: string
  type: string
  startDate: string
  workHours: string
  compensation: string
  monthlySalary: string
  benefits: string
  specialConditions: string
  companyRepresentative: string
  employee: string
}

interface Props { data: OfferLetterData; labels?: OfferLetterLabels }

const DEFAULT_LABELS: OfferLetterLabels = {
  offerTitle: 'OFFER OF EMPLOYMENT',
  parties: 'PARTIES',
  offerMadeBy: 'This offer is made by',
  offerTo: 'to',
  position: 'POSITION',
  title: 'Title:',
  type: 'Type:',
  startDate: 'Start Date:',
  workHours: 'Work Hours:',
  compensation: 'COMPENSATION',
  monthlySalary: 'Monthly Salary:',
  benefits: 'BENEFITS',
  specialConditions: 'SPECIAL CONDITIONS',
  companyRepresentative: 'Company Representative',
  employee: 'Employee',
}

export function OfferLetterPDF({ data, labels: propLabels }: Props) {
  const labels = { ...DEFAULT_LABELS, ...propLabels }
  const o = data
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{labels.offerTitle}</Text>
        <Text style={styles.subtitle}>{o.company?.name || 'AdminMate AI'}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>{labels.parties}</Text>
          <Text>{labels.offerMadeBy} <Text style={styles.bold}>{o.company?.name || 'AdminMate AI'}</Text></Text>
          <Text>{labels.offerTo} <Text style={styles.bold}>{o.candidates?.full_name || o.candidate_name}</Text></Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{labels.position}</Text>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.bold}>{labels.title}</Text><Text>{o.position_title}</Text></View>
            <View style={styles.col}><Text style={styles.bold}>{labels.type}</Text><Text>{o.employment_type?.replace('_', ' ')}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.bold}>{labels.startDate}</Text><Text>{o.start_date}</Text></View>
            <View style={styles.col}><Text style={styles.bold}>{labels.workHours}</Text><Text>{o.work_hours || '09:00-18:00'}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{labels.compensation}</Text>
          <Text>{labels.monthlySalary} {new Intl.NumberFormat('en-US', { style: 'currency', currency: o.salary_currency || 'THB' }).format(o.salary_offered ?? 0)}</Text>
        </View>

        {o.benefits && o.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>{labels.benefits}</Text>
            {o.benefits.map((b: string, i: number) => <Text key={i}>• {b}</Text>)}
          </View>
        )}

        {o.special_conditions && (
          <View style={styles.section}>
            <Text style={styles.label}>{labels.specialConditions}</Text>
            <Text>{o.special_conditions}</Text>
          </View>
        )}

        <View style={styles.signature}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <View style={styles.line} />
              <Text style={{ marginTop: 4, fontWeight: 700 }}>{labels.companyRepresentative}</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{o.company?.name}</Text>
            </View>
            <View>
              <View style={{ ...styles.line, borderStyle: 'dashed' }} />
              <Text style={{ marginTop: 4, fontWeight: 700 }}>{labels.employee}</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{o.candidates?.full_name}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
