import { Job, Candidate, OnboardingDoc, OnboardingTask, CompareMatch, AppSettings, Language } from './types';

export const initialJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Sales Executive',
    department: 'Sales & Business Development',
    experienceLevel: '1-3 Years',
    salaryRange: '35,000 - 50,000 THB',
    jobType: 'Full-time',
    responsibilities: [
      'Manage customer relationships and client happiness',
      'Discover and qualify leads in target industrial sectors',
      'Negotiate terms and close sales deals weekly',
      'Coordinate with customer onboarding teams to ensure success'
    ],
    skills: ['B2B Sales', 'Negotiation', 'CRM', 'Public Speaking', 'English-speaking'],
    createdAt: '2026-05-15',
    language: 'EN'
  },
  {
    id: 'job-2',
    title: 'Marketing Specialist',
    department: 'Marketing & PR',
    experienceLevel: '2-5 Years',
    salaryRange: '40,000 - 60,000 THB',
    jobType: 'Full-time / Hybrid',
    responsibilities: [
      'Design, execute, and monitor digital marketing campaigns across Meta, TikTok, and Google',
      'Manage content production with internal designers and copywriters',
      'Analyze search trends and optimize visual layouts for SME landing pages',
      'Measure and report performance of all digital marketing campaigns'
    ],
    skills: ['Facebook Ads', 'Canva', 'Content Writing', 'Google Analytics', 'SEO'],
    createdAt: '2569-05-20',
    language: 'TH'
  }
];

export const initialCandidates: Candidate[] = [
  {
    id: 'cand-1',
    name: 'Nattapong Siri (ณัฐพงษ์ ศิริ)',
    positionApplied: 'Marketing Specialist',
    skills: ['Facebook Ads', 'Canva', 'Content Writing', 'SEO', 'CapCut'],
    experience: '2 years of digital agency experience',
    education: 'Bachelor of Business Administration, Chulalongkorn University',
    aiSummary: 'Strong fit for junior marketing role. Has relevant digital marketing experience and good content creation skills.',
    matchScore: 86,
    status: 'Shortlisted',
    notes: 'Very enthusiastic in initial chat. Highlighted meta campaigns that improved SME sales by 30%.',
    email: 'nattapong.s@gmail.com',
    phone: '081-234-5678'
  },
  {
    id: 'cand-2',
    name: 'Pitchaya Srisai (พิชญะ ศรีใส)',
    positionApplied: 'Sales Executive',
    skills: ['B2B Sales', 'Negotiation', 'CRM', 'Thai', 'English'],
    experience: '3 years of corporate software sales',
    education: 'B.Sc. in Information Technology, Kasetsart University',
    aiSummary: 'Excellent match. Proven high-commission salesperson with SaaS-related sales background. Highly articulate in English.',
    matchScore: 94,
    status: 'Interview',
    notes: 'Schedule Zoom interview on Friday at 2:00 PM.',
    email: 'pitchaya.s@adminmate.ai',
    phone: '089-876-5432'
  },
  {
    id: 'cand-3',
    name: 'Siriporn Meedee (ศิริพร มีดี)',
    positionApplied: 'Sales Executive',
    skills: ['Negotiation', 'Public Speaking', 'Admin Planning'],
    experience: '1 year of general retail sales',
    education: 'Bachelor of Arts in English, Thammasat University',
    aiSummary: 'Good communication skills but lacks active CRM & outbound B2B experience. Highly trainable for junior execution.',
    matchScore: 71,
    status: 'New',
    notes: 'Needs resume screening call to verify interest levels for outbound cold calls.',
    email: 'siriporn.md@outlook.com',
    phone: '085-333-4455'
  },
  {
    id: 'cand-4',
    name: 'Anan Wang (อนันต์ หวัง)',
    positionApplied: 'Senior Cloud Architect',
    skills: ['AWS', 'Kubernetes', 'Terraform', 'PostgreSQL'],
    experience: '7 years of cloud engineering',
    education: 'Master of Engineering, King Mongkut Institute',
    aiSummary: 'Extremely overqualified or candidate applied for wrong role. High core technical developer but doesn’t fit listed SME sales profile.',
    matchScore: 32,
    status: 'Rejected',
    notes: 'Archive application and notify about potential technical lead opportunities in the future.',
    email: 'anan.w@cloudtech.co',
    phone: '082-999-8888'
  },
  {
    id: 'cand-5',
    name: 'Somsak Rakthai (สมศักดิ์ รักไทย)',
    positionApplied: 'Marketing Specialist',
    skills: ['Photoshop', 'Video Editing', 'Event Management'],
    experience: '4 years of field marketing',
    education: 'B.A. in Communications, Bangkok University',
    aiSummary: 'Practical agency designer but lacks modern automated direct-response Facebook ad attribution metrics or SaaS funnel experience.',
    matchScore: 68,
    status: 'New',
    notes: 'Portfolio is strong in branding; might be a secondary fit if we require a graphic generalist.',
    email: 'somsak.rt@outlook.com',
    phone: '088-777-6655'
  }
];

export const initialDocs: OnboardingDoc[] = [
  { id: 'doc-1', nameEn: 'ID Card Copy / Passport', nameTh: 'สำเนาบัตรประชาชน / หนังสือเดินทาง', status: 'Completed', lastUpdated: '2026-05-28' },
  { id: 'doc-2', nameEn: 'Bank Account Information', nameTh: 'หน้าสมุดบัญชีธนาคาร (สำหรับรับเงินเดือน)', status: 'Completed', lastUpdated: '2026-05-28' },
  { id: 'doc-3', nameEn: 'Employment Contract', nameTh: 'สัญญาจ้างงานอิเล็กทรอนิกส์', status: 'Pending', lastUpdated: 'Sent on 2026-05-29' },
  { id: 'doc-4', nameEn: 'Non-Disclosure Agreement (NDA)', nameTh: 'ข้อตกลงรักษาความลับ (NDA)', status: 'Pending', lastUpdated: 'Sent on 2026-05-29' },
  { id: 'doc-5', nameEn: 'Company Policy Acknowledgment', nameTh: 'ใบเซ็นรับทราบระเบียบสำนักงาน', status: 'Missing' },
  { id: 'doc-6', nameEn: 'Withholding Tax Form (P.N.D.91 / P.N.D.3)', nameTh: 'เอกสารหักภาษี ณ ที่จ่าย (ป.พ. 30 / สัญญาภาษี)', status: 'Missing' }
];

export const initialTasks: OnboardingTask[] = [
  { id: 'task-1', taskEn: 'Sign employment documents & submit ID copy', taskTh: 'ลงนามเอกสารสัญญาจ้างและส่งสำเนาบัตรประชาชน', timeframe: 'Day 1', completed: true },
  { id: 'task-2', taskEn: 'Join company LINE/Slack chat group', taskTh: 'เข้าร่วมกลุ่มพูดคุยของบริษัท (LINE หรือ Slack)', timeframe: 'Day 1', completed: true },
  { id: 'task-3', taskEn: 'Meet with your department manager (1-on-1 greeting)', taskTh: 'พูดคุยส่วนตัวแนะแนวงานกับผู้จัดการแผนก (1-on-1)', timeframe: 'Day 1', completed: false },
  { id: 'task-4', taskEn: 'Read company handbook & core values', taskTh: 'อ่านคู่มือพนักงานใหม่และแนวคิดหลักองค์กร', timeframe: 'Day 1', completed: false },
  { id: 'task-5', taskEn: 'Set up company GSuite / work email accounts', taskTh: 'ติดตั้งตั้งค่าบัญชีอีเมลสำหรับใช้ทำงาน G-Suite / Outlook', timeframe: 'Day 1', completed: false },
  { id: 'task-6', taskEn: 'Confirm office equipment/laptop receipt and health check', taskTh: 'ตรวจรับและเซ็นเอกสารรับอุปกรณ์ทำงาน / โน้ตบุ๊กประจำตัว', timeframe: 'Day 1', completed: false },
  { id: 'task-7', taskEn: 'Review first sprint objectives & documentation parameters', taskTh: 'ประเมินแผนงานช่วงแรกพร้อมเรียนรู้องค์ความรู้แผนก', timeframe: 'Week 1', completed: false },
  { id: 'task-8', taskEn: 'Complete Security & Anti-Phishing awareness reading', taskTh: 'เรียนรู้หลักความปลอดภัยไซเบอร์และพรีเวนชั่นสแปม', timeframe: 'Week 1', completed: false }
];

export const sampleCompareMatch = (jobTitle: string, candName: string): CompareMatch => {
  return {
    jobTitle,
    candidateName: candName,
    matchScore: candName.includes('Nattapong') ? 86 : candName.includes('Pitchaya') ? 94 : 71,
    skillMatch: [
      { name: 'Facebook Ads', matched: candName.includes('Nattapong') || candName.includes('Pitchaya') },
      { name: 'Canva', matched: candName.includes('Nattapong') },
      { name: 'Content Writing', matched: candName.includes('Nattapong') },
      { name: 'B2B Sales', matched: candName.includes('Pitchaya') },
      { name: 'Negotiation', matched: candName.includes('Pitchaya') || candName.includes('Siriporn') },
      { name: 'CRM Tooling', matched: candName.includes('Pitchaya') }
    ],
    experienceMatch: candName.includes('Pitchaya') 
      ? 'Fully Aligned: 3 years corporate IT sales is perfect for high-touch SME software deployment.'
      : candName.includes('Nattapong')
      ? 'Highly Acceptable: 2 years digital agency experience aligns with fast marketing iteration.'
      : 'Partially Aligned: Lacks core CRM tool knowledge, but has strong language communication skills.',
    missingSkills: candName.includes('Pitchaya')
      ? ['Ad Campaign Metrics']
      : candName.includes('Nattapong')
      ? ['SEO Tech Auditing', 'Google Analytics v4']
      : ['B2B Closing Matrix', 'Cold-lead CRM Pipelines'],
    suggestedQuestions: candName.includes('Pitchaya')
      ? [
          'Can you walk us through a complex enterprise deal you negotiated? What was the deal value and cycle?',
          'How do you manage client expectations when feature requests are not immediately feasible in the software?'
        ]
      : candName.includes('Nattapong')
      ? [
          'How do you measure CPC and ROAS across campaigns you managed previously?',
          'Show us a design from Canva you completed under pressure and describe your copywriting approach.'
        ]
      : [
          'What steps do you take to research a customer lead before placing a call?',
          'How do you handle rejection over the phone or email to turn it around?'
        ]
  };
};

export const defaultSettings: AppSettings = {
  companyName: 'Lanna Digital Solutions Co., Ltd.',
  companyLogoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80',
  defaultLanguage: 'TH',
  notificationsEnabled: true,
  userRole: 'HR'
};

export const prebuiltAiOnboardingAnswers = {
  EN: [
    {
      keywords: ['time', 'start', 'hour', '9', 'schedule'],
      answer: "You start work at 9:00 AM officially on Monday through Friday. Please arrive around 8:45 AM on your first day for welcoming setup and coffee!"
    },
    {
      keywords: ['document', 'missing', 'need', 'card', 'id'],
      answer: "You are currently missing: Withholding Tax Form and Company Policy Acknowledgment. Also note that your NDA is still in \"Pending\" signature status. Please bring a copy of your bank account detail and physical ID card copy on your first day."
    },
    {
      keywords: ['prepare', 'first day', 'what to bring', 'bring'],
      answer: "For your first day, please prepare a copy of your physical National ID Card / Passport and Bank Statement page for payroll. We provide a business notebook laptop and standard accessories, so you don't need to bring personal tech equipment."
    },
    {
      keywords: ['leave', 'holiday', 'vacation', 'sick', 'day'],
      answer: "All new team members receive 6 days of annual paid leave (calculated pro-rata in year one) plus 30 days of standard certified sick leave and company official holidays."
    }
  ],
  TH: [
    {
      keywords: ['เวลา', 'เริ่มงาน', 'เข้างาน', 'กี่โมง', 'ทำงาน'],
      answer: "เวลาเข้างานปกติคือ 09:00 น. วันจันทร์ถึงวันศุกร์ ในวันแรกขอแนะนำให้มาถึงราวๆ 08:45 น. เพื่อรับอุปกรณ์ไอทีและต้อนรับร่วมจิบกาแฟกับทีม!"
    },
    {
      keywords: ['เอกสาร', 'ขาด', 'ไม่ครบ', 'ต้องส่ง', 'บัตรประชาชน'],
      answer: "ระบบของคุณตรวจพบว่ายังขาด: 'แบบฟอร์มยืนยันประมวลผลระเบียบสำนักงาน' และ 'เอกสารยื่นหักภาษี ณ ที่จ่าย' และยังมีสัญญา NDA ที่ค้างลงนามโปรดตรวจสอบและนำสำเนาสมุดบัญชีธนาคารกับสำเนาบัตรประชาชนใบจริงมาให้ HR ในวันแรกด้วยครับ"
    },
    {
      keywords: ['เตรียมตัว', 'เตรียมอะไร', 'วันแรก', 'ของที่ต้องพก'],
      answer: "กรุณาส่งมอบรายละเอียดเลขหน้าสมุดธนาคารผู้รับเงินเดือนกับสำเนาบัตรประชาชนตัวจริง บริษัทจัดเตรียมโน้ตบุ๊กทำงาน อุปกรณ์หูฟัง และชุดรับขวัญพนักงานใหม่ (Welcome Pack) ไว้บริการครบครัน จึงไม่ต้องกังวลเรื่องอุปกรณ์ส่วนตัว"
    },
    {
      keywords: ['ลา', 'วันหยุด', 'พักร้อน', 'ลาป่วย', 'กี่วัน'],
      answer: "พนักงานใหม่จะได้รับสิทธิ์ลากิจ/ลาพักร้อนประจำปี 6 วัน (คำนวณตามสัดส่วนอายุงานในปีแรกสุด) และมีวันลาป่วยตามกฎหมายคุ้มครองแรงงานสูงสุด 30 วันโดยได้รับค่าจ้าง พร้อมวันหยุดทางการของบริษัทประจำปีครับ"
    }
  ]
};
export const defaultCvTemplate = {
  fullName: "Suriya Techavichian (สุริยา เตชะวิเชียร)",
  email: "suriya.tech@gmail.com",
  phone: "083-490-1122",
  targetPosition: "Marketing Specialist",
  summary: "Experienced digital marketing enthusiast specializing in lead generation, social advertisement optimization, and creative bilingual copy.",
  workExperience: [
    {
      company: "Innovate Global Growth Co.",
      role: "Junior Media Buyer",
      duration: "18 Months (2024 - 2026)",
      details: "Successfully budgeted 100K+ THB monthly on targeted Meta Ads, reducing overall CPL by 14%."
    }
  ],
  education: [
    {
      school: "Chiang Mai University",
      degree: "B.A. in Communications & Mass Media",
      year: "2024"
    }
  ],
  skills: ["Meta Ads", "Canva Styling", "Content Planner", "SEO Auditing"],
  portfolioLink: "https://behance.net/suriyacreative",
  language: "EN" as Language
};
