export type ChatIntent = 'jobs' | 'status' | 'help' | 'policy' | 'leave' | 'benefits' | 'general'

const INTENT_PATTERNS: Record<ChatIntent, RegExp> = {
  jobs: /\b(job|position|opening|work|hire|recruit|apply|vacancy|งาน|ตำแหน่ง|สมัคร|สมัครงาน|tuyển|việc|职位|招聘|申请|岗位)\b/i,
  status: /\b(status|progress|application|apply|track|follow|สถานะ|สถานะการสมัคร|ความคืบหน้า|tiến độ|trạng thái|状态|进度|申请)\b/i,
  help: /\b(help|how|guide|tutorial|assist|ช่วย|วิธี|ช่วยเหลือ|hướng dẫn|trợ giúp|帮助|指南|协助)\b/i,
  policy: /\b(policy|rule|regulation|guideline|handbook|นโยบาย|ระเบียบ|ข้อบังคับ|chính sách|quy định|政策|规定|规章)\b/i,
  leave: /\b(leave|vacation|day off|holiday|sick|personal|ลา|วันหยุด|ลางาน|nghỉ|phép|假期|休假|病假)\b/i,
  benefits: /\b(benefit|insurance|health|welfare|perk|bonus|สวัสดิการ|ประกัน|สุขภาพ|phúc lợi|bảo hiểm|福利|保险|健康)\b/i,
  general: /.*/,
}

export function detectIntent(text: string): ChatIntent {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (intent !== 'general' && pattern.test(text)) return intent as ChatIntent
  }
  return 'general'
}

const INTENT_CONTEXTS: Record<ChatIntent, Record<string, string>> = {
  jobs: {
    en: 'The user is asking about job openings or positions. Help them find available positions, explain how to apply, and provide details about open roles at the company.',
    th: 'ผู้ใช้สอบถามเกี่ยวกับตำแหน่งงานที่เปิดรับ ช่วยค้นหาตำแหน่งที่ว่าง อธิบายวิธีการสมัคร และให้รายละเอียดเกี่ยวกับตำแหน่งที่เปิดรับในบริษัท',
    vi: 'Người dùng hỏi về vị trí tuyển dụng. Giúp họ tìm vị trí trống, giải thích cách nộp đơn và cung cấp chi tiết về các vị trí đang tuyển.',
    zh: '用户正在询问职位空缺或招聘情况。帮助他们找到可用职位，解释如何申请，并提供公司招聘职位的详细信息。',
  },
  status: {
    en: 'The user is asking about their application or task status. Help them check the progress of their applications, leave requests, or other pending items.',
    th: 'ผู้ใช้สอบถามเกี่ยวกับสถานะการสมัครงานหรือสถานะงาน ช่วยตรวจสอบความคืบหน้าของการสมัคร คำขอลางาน หรือรายการที่รอดำเนินการ',
    vi: 'Người dùng hỏi về tình trạng đơn xin việc hoặc công việc. Giúp họ kiểm tra tiến độ đơn xin việc, yêu cầu nghỉ phép hoặc các mục chờ xử lý.',
    zh: '用户正在询问申请或任务状态。帮助他们检查申请、请假请求或其他待处理事项的进度。',
  },
  help: {
    en: 'The user needs help or guidance. Provide step-by-step instructions on how to use the system, complete tasks, or access features.',
    th: 'ผู้ใช้ต้องการความช่วยเหลือหรือคำแนะนำ ให้คำแนะนำทีละขั้นตอนเกี่ยวกับการใช้งานระบบ การทำ tasks หรือการเข้าถึงฟีเจอร์ต่างๆ',
    vi: 'Người dùng cần trợ giúp hoặc hướng dẫn. Cung cấp hướng dẫn từng bước về cách sử dụng hệ thống, hoàn thành tác vụ hoặc truy cập các tính năng.',
    zh: '用户需要帮助或指导。提供关于如何使用系统、完成任务或访问功能的分步说明。',
  },
  policy: {
    en: 'The user is asking about company policies, rules, or regulations. Provide information about company guidelines, workplace rules, and compliance requirements.',
    th: 'ผู้ใช้สอบถามเกี่ยวกับนโยบายบริษัท กฎระเบียบ หรือข้อบังคับ ให้ข้อมูลเกี่ยวกับแนวทางของบริษัท กฎที่ทำงาน และข้อกำหนดการปฏิบัติตาม',
    vi: 'Người dùng hỏi về chính sách, quy tắc hoặc quy định của công ty. Cung cấp thông tin về hướng dẫn của công ty, quy tắc nơi làm việc và yêu cầu tuân thủ.',
    zh: '用户正在询问公司政策、规章制度。提供有关公司指南、工作场所规则和合规要求的信息。',
  },
  leave: {
    en: 'The user is asking about leave, vacation, or time off. Help them understand leave policies, how to request time off, and available leave types.',
    th: 'ผู้ใช้สอบถามเกี่ยวกับการลา วันหยุด หรือการลางาน ช่วยอธิบายนโยบายการลา วิธีการขอหยุด และประเภทการลาที่มี',
    vi: 'Người dùng hỏi về nghỉ phép, nghỉ hè hoặc nghỉ ngày. Giúp họ hiểu chính sách nghỉ phép, cách xin nghỉ và các loại nghỉ phép hiện có.',
    zh: '用户正在询问休假、假期或请假情况。帮助他们了解请假政策、如何申请休假以及可用的假期类型。',
  },
  benefits: {
    en: 'The user is asking about employee benefits, insurance, or welfare. Provide information about health insurance, perks, bonuses, and other benefits.',
    th: 'ผู้ใช้สอบถามเกี่ยวกับสวัสดิการ ประกัน หรือสิทธิประโยชน์ ให้ข้อมูลเกี่ยวกับประกันสุขภาพ โบนัส สวัสดิการอื่นๆ',
    vi: 'Người dùng hỏi về phúc lợi, bảo hiểm hoặc quyền lợi nhân viên. Cung cấp thông tin về bảo hiểm sức khỏe, quyền lợi, thưởng và các phúc lợi khác.',
    zh: '用户正在询问员工福利、保险或待遇。提供有关健康保险、津贴、奖金和其他福利的信息。',
  },
  general: {},
}

export function getIntentContext(intent: ChatIntent, language: string): string {
  return INTENT_CONTEXTS[intent]?.[language] || INTENT_CONTEXTS[intent]?.en || ''
}
