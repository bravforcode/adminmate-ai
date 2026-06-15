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

interface Props { data: OfferLetterData }

export function OfferLetterPDF({ data }: Props) {
  const o = data
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>OFFER OF EMPLOYMENT</Text>
        <Text style={styles.subtitle}>{o.company?.name || 'AdminMate AI'}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>PARTIES</Text>
          <Text>This offer is made by <Text style={styles.bold}>{o.company?.name || 'AdminMate AI'}</Text></Text>
          <Text>to <Text style={styles.bold}>{o.candidates?.full_name || o.candidate_name}</Text></Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>POSITION</Text>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.bold}>Title:</Text><Text>{o.position_title}</Text></View>
            <View style={styles.col}><Text style={styles.bold}>Type:</Text><Text>{o.employment_type?.replace('_', ' ')}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.bold}>Start Date:</Text><Text>{o.start_date}</Text></View>
            <View style={styles.col}><Text style={styles.bold}>Work Hours:</Text><Text>{o.work_hours || '09:00-18:00'}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>COMPENSATION</Text>
          <Text>Monthly Salary: {new Intl.NumberFormat('en-US', { style: 'currency', currency: o.salary_currency || 'THB' }).format(o.salary_offered ?? 0)}</Text>
        </View>

        {o.benefits && o.benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>BENEFITS</Text>
            {o.benefits.map((b: string, i: number) => <Text key={i}>• {b}</Text>)}
          </View>
        )}

        {o.special_conditions && (
          <View style={styles.section}>
            <Text style={styles.label}>SPECIAL CONDITIONS</Text>
            <Text>{o.special_conditions}</Text>
          </View>
        )}

        <View style={styles.signature}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <View style={styles.line} />
              <Text style={{ marginTop: 4, fontWeight: 700 }}>Company Representative</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{o.company?.name}</Text>
            </View>
            <View>
              <View style={{ ...styles.line, borderStyle: 'dashed' }} />
              <Text style={{ marginTop: 4, fontWeight: 700 }}>Employee</Text>
              <Text style={{ fontSize: 9, color: '#666' }}>{o.candidates?.full_name}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
