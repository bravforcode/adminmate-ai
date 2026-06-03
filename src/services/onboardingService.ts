import { supabase } from '../lib/supabase'

const COUNTRY_TEMPLATES: Record<string, any[]> = {
  TH: [
    { task_name: 'กรอกแบบฟอร์มข้อมูลพนักงาน', task_name_en: 'Fill employee information form', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'ส่งสำเนาบัตรประชาชน', task_name_en: 'Submit ID card copy', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'ลงทะเบียนประกันสังคม', task_name_en: 'Register Social Security', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'แจ้งเลขบัญชีธนาคาร', task_name_en: 'Submit bank account details', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'รับอุปกรณ์คอมพิวเตอร์', task_name_en: 'Receive IT equipment', category: 'it', timeframe: 'day_1', assigned_to: 'IT' },
    { task_name: 'ตั้งค่า Email บริษัท', task_name_en: 'Setup company email', category: 'it', timeframe: 'day_1', assigned_to: 'IT' },
    { task_name: 'อ่านคู่มือพนักงาน', task_name_en: 'Read employee handbook', category: 'hr', timeframe: 'week_1', assigned_to: 'HR' },
    { task_name: 'เซ็นสัญญาจ้างงาน', task_name_en: 'Sign employment contract', category: 'hr', timeframe: 'week_1', assigned_to: 'HR' },
    { task_name: 'เข้าร่วมปฐมนิเทศ', task_name_en: 'Attend orientation', category: 'training', timeframe: 'week_1', assigned_to: 'HR' },
    { task_name: 'พบผู้จัดการ (1-on-1)', task_name_en: 'Meet manager (1-on-1)', category: 'social', timeframe: 'week_1', assigned_to: 'Manager' },
  ],
  VN: [
    { task_name: 'Cung cấp CCCD/CMND', task_name_en: 'Submit ID card', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Đăng ký BHXH', task_name_en: 'Register social insurance', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Ký hợp đồng lao động', task_name_en: 'Sign labor contract', category: 'hr', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Nhận laptop + thiết bị', task_name_en: 'Receive laptop + equipment', category: 'it', timeframe: 'day_1', assigned_to: 'IT' },
    { task_name: 'Tham gia nhóm Zalo công ty', task_name_en: 'Join company Zalo group', category: 'it', timeframe: 'day_1', assigned_to: 'IT' },
    { task_name: 'Họp định hướng nhân viên mới', task_name_en: 'New hire orientation meeting', category: 'training', timeframe: 'week_1', assigned_to: 'HR' },
  ],
  ID: [
    { task_name: 'Fotokopi KTP + NPWP', task_name_en: 'Submit KTP + NPWP copy', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Pendaftaran BPJS Ketenagakerjaan', task_name_en: 'Register BPJS Employment', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Buka rekening bank', task_name_en: 'Open bank account', category: 'admin', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Tanda tangan kontrak kerja', task_name_en: 'Sign employment contract', category: 'hr', timeframe: 'day_1', assigned_to: 'HR' },
    { task_name: 'Terima laptop + perlengkapan', task_name_en: 'Receive laptop + equipment', category: 'it', timeframe: 'day_1', assigned_to: 'IT' },
    { task_name: 'Orientasi karyawan baru', task_name_en: 'New employee orientation', category: 'training', timeframe: 'week_1', assigned_to: 'HR' },
  ],
}

export const onboardingService = {
  getChecklists: async (companyId: string) => {
    const { data, error } = await supabase.from('onboarding_checklists').select('*, user_profiles!employee_id(full_name, email)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getChecklist: async (id: string) => {
    const { data, error } = await supabase.from('onboarding_checklists').select('*, onboarding_tasks(*)').eq('id', id).single()
    if (error) throw error
    return data
  },
  createChecklist: async (companyId: string, employeeId: string, offerId: string, country: string) => {
    const countryCode = country || 'TH'
    const { data: checklist, error } = await supabase.from('onboarding_checklists').insert({
      company_id: companyId, employee_id: employeeId, offer_id: offerId,
      template_name: `${countryCode}_standard_v1`, status: 'in_progress',
      start_date: new Date().toISOString().split('T')[0],
    }).select().single()
    if (error) throw error

    const template = COUNTRY_TEMPLATES[countryCode] || COUNTRY_TEMPLATES.TH
    const tasks = template.map((t, i) => ({ checklist_id: checklist.id, company_id: companyId, ...t, order_index: i }))
    await supabase.from('onboarding_tasks').insert(tasks)
    return checklist
  },
  updateTask: async (taskId: string, isCompleted: boolean, completedBy?: string) => {
    await supabase.from('onboarding_tasks').update({
      is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null, completed_by: completedBy,
    }).eq('id', taskId)
  },
  updateProgress: async (checklistId: string) => {
    const { data: tasks } = await supabase.from('onboarding_tasks').select('is_completed').eq('checklist_id', checklistId)
    if (!tasks) return
    const pct = tasks.length ? Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100) : 0
    await supabase.from('onboarding_checklists').update({
      progress_percentage: pct, status: pct >= 100 ? 'completed' : 'in_progress', completed_at: pct >= 100 ? new Date().toISOString() : null,
    }).eq('id', checklistId)
  },
}
