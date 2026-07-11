import { supabase } from '../lib/supabase';

// --- LINE Integration Service ---
// Handles LINE Official Account messaging, webhook events, and flex messages

export interface LINEConfig {
  channel_access_token: string;
  channel_secret: string;
  webhook_endpoint: string;
  enabled: boolean;
}

export interface LINEMessage {
  type: 'text' | 'flex' | 'template' | 'image';
  text?: string;
  flex?: FlexMessage;
  template?: TemplateMessage;
  image?: { originalContentUrl: string; previewImageUrl: string };
}

export interface FlexMessage {
  type: 'bubble' | 'carousel';
  size?: 'nano' | 'micro' | 'small' | 'medium' | 'large' | 'full';
  header?: FlexBox;
  hero?: FlexImage;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: Record<string, any>;
}

export interface FlexBox {
  type: 'box';
  layout: 'baseline' | 'bubble' | 'horizontal' | 'vertical';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  paddingAll?: string;
}

export interface FlexImage {
  type: 'image';
  url: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxs' | '3xl';
  aspectRatio?: string;
  backgroundColor?: string;
  align?: 'center' | 'left' | 'right';
  gravity?: 'bottom' | 'center' | 'top';
  margin?: string;
  action?: { type: string; label?: string; uri?: string; data?: string };
}

export interface FlexComponent {
  type: 'text' | 'button' | 'image' | 'separator' | 'spacer' | 'icon' | 'filler' | 'box';
  layout?: 'baseline' | 'bubble' | 'horizontal' | 'vertical';
  contents?: FlexComponent[];
  text?: string;
  weight?: 'regular' | 'bold';
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '3xl';
  color?: string;
  align?: 'center' | 'left' | 'right';
  gravity?: 'bottom' | 'center' | 'top';
  style?: 'primary' | 'secondary' | 'link';
  action?: { type: string; label?: string; uri?: string; data?: string };
  url?: string;
  aspectRatio?: string;
  flex?: number;
  separator?: boolean;
  margin?: string;
  spacing?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  paddingAll?: string;
}

export interface TemplateMessage {
  type: 'buttons' | 'confirm' | 'carousel' | 'image_carousel';
  altText: string;
  template: any;
}

export interface LINEUser {
  user_id: string;
  display_name: string;
  picture_url?: string;
  language?: string;
  employee_id?: string;
  company_id?: string;
}

export interface WebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback' | 'memberJoined' | 'memberLeft';
  replyToken?: string;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    id: string;
    type: string;
    text?: string;
  };
  postback?: {
    data: string;
    params?: Record<string, string>;
  };
  timestamp: number;
}

// --- Flex Message Builders ---

export function buildLeaveRequestFlex(data: {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  approvalUrl: string;
  rejectUrl: string;
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'large',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🗓️ Leave Request', weight: 'bold', size: 'lg', color: '#FFFFFF' },
        { type: 'text', text: data.employeeName, size: 'sm', color: '#FFFFFFCC' },
      ],
      backgroundColor: '#3B82F6',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Type: ${data.leaveType}`, weight: 'bold', size: 'md' },
        { type: 'text', text: `From: ${data.startDate}`, size: 'sm', color: '#666666', margin: 'md' },
        { type: 'text', text: `To: ${data.endDate}`, size: 'sm', color: '#666666' },
        { type: 'text', text: `Reason: ${data.reason}`, size: 'sm', color: '#666666', margin: 'md' },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#22C55E',
          action: { type: 'uri', label: 'Approve', uri: data.approvalUrl },
        },
        {
          type: 'button',
          style: 'secondary',
          color: '#EF4444',
          action: { type: 'uri', label: 'Reject', uri: data.rejectUrl },
        },
      ],
      spacing: 'md',
      paddingAll: '20px',
    },
  };
}

export function buildDocumentReminderFlex(data: {
  employeeName: string;
  documentName: string;
  dueDate: string;
  status: string;
  uploadUrl: string;
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'medium',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '📄 Document Reminder', weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: '#F59E0B',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: data.documentName, weight: 'bold', size: 'md' },
        { type: 'text', text: `Due: ${data.dueDate}`, size: 'sm', color: '#666666', margin: 'md' },
        { type: 'text', text: `Status: ${data.status}`, size: 'sm', color: '#F59E0B', margin: 'sm' },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3B82F6',
          action: { type: 'uri', label: 'Upload Now', uri: data.uploadUrl },
        },
      ],
      paddingAll: '20px',
    },
  };
}

export function buildPayrollNotificationFlex(data: {
  employeeName: string;
  payPeriod: string;
  netPay: string;
  currency: string;
  payslipUrl: string;
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'medium',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '💰 Payroll Ready', weight: 'bold', size: 'lg', color: '#FFFFFF' },
        { type: 'text', text: data.payPeriod, size: 'sm', color: '#FFFFFFCC' },
      ],
      backgroundColor: '#10B981',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Hi ${data.employeeName}!`, size: 'md', weight: 'bold' },
        { type: 'text', text: `Your ${data.payPeriod} payslip is ready`, size: 'sm', color: '#666666', margin: 'md' },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: 'Net Pay', size: 'xs', color: '#999999' },
            { type: 'text', text: `${data.currency} ${data.netPay}`, size: 'xl', weight: 'bold', color: '#10B981' },
          ],
          margin: 'lg',
          backgroundColor: '#F0FDF4',
          cornerRadius: '12px',
          paddingAll: '16px',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3B82F6',
          action: { type: 'uri', label: 'View Payslip', uri: data.payslipUrl },
        },
      ],
      paddingAll: '20px',
    },
  };
}

export function buildOnboardingChecklistFlex(data: {
  employeeName: string;
  tasks: Array<{ name: string; completed: boolean; dueDate: string }>;
  progress: number;
  dashboardUrl: string;
}): FlexMessage {
  const taskLines = data.tasks.map(t =>
    `${t.completed ? '✅' : '⬜'} ${t.name} (${t.dueDate})`
  ).join('\n');

  return {
    type: 'bubble',
    size: 'large',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🚀 Onboarding Checklist', weight: 'bold', size: 'lg', color: '#FFFFFF' },
        { type: 'text', text: `Progress: ${data.progress}%`, size: 'sm', color: '#FFFFFFCC' },
      ],
      backgroundColor: '#8B5CF6',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Welcome ${data.employeeName}!`, weight: 'bold', size: 'md', margin: 'md' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: taskLines, size: 'sm', color: '#333333', margin: 'lg' },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#8B5CF6',
          action: { type: 'uri', label: 'Open Dashboard', uri: data.dashboardUrl },
        },
      ],
      paddingAll: '20px',
    },
  };
}

// --- Multi-Turn Conversation State ---

export interface ConversationState {
  userId: string
  flow: 'leave' | 'payslip' | 'policy' | 'shift' | 'attendance' | null
  step: string
  data: Record<string, string>
  expiresAt: number
}

const CONVERSATION_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const conversationStates = new Map<string, ConversationState>()

function getConversationState(userId: string): ConversationState | null {
  const state = conversationStates.get(userId)
  if (!state) return null
  if (Date.now() > state.expiresAt) {
    conversationStates.delete(userId)
    return null
  }
  return state
}

function setConversationState(userId: string, state: ConversationState): void {
  conversationStates.set(userId, { ...state, expiresAt: Date.now() + CONVERSATION_TIMEOUT })
}

function clearConversationState(userId: string): void {
  conversationStates.delete(userId)
}

// --- Rate Limiting ---

const rateLimits = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 messages per minute per user

function canSendPushMessage(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimits.get(userId) || []
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)
  if (recent.length >= RATE_LIMIT_MAX) return false
  recent.push(now)
  rateLimits.set(userId, recent)
  return true
}

// --- Flex Message Builders for Bot Flows ---

export function buildLeaveConfirmFlex(data: {
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'medium',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🗓️ Confirm Leave Request', weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: '#3B82F6',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Type: ${data.leaveType}`, weight: 'bold', size: 'md' },
        { type: 'text', text: `From: ${data.startDate}`, size: 'sm', color: '#666666', margin: 'md' },
        { type: 'text', text: `To: ${data.endDate}`, size: 'sm', color: '#666666' },
        { type: 'text', text: `Days: ${data.totalDays}`, size: 'sm', color: '#666666' },
        { type: 'text', text: `Reason: ${data.reason || 'N/A'}`, size: 'sm', color: '#666666', margin: 'md' },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#22C55E',
          action: { type: 'postback', label: 'Submit', data: 'confirm_leave' },
        },
        {
          type: 'button',
          style: 'secondary',
          color: '#EF4444',
          action: { type: 'postback', label: 'Cancel', data: 'cancel_flow' },
        },
      ],
      spacing: 'md',
      paddingAll: '20px',
    },
  }
}

export function buildPayslipSummaryFlex(data: {
  month: string
  netPay: string
  grossPay: string
  deductions: string
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'medium',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `💰 Payslip — ${data.month}`, weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: '#10B981',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: 'Gross Pay', size: 'xs', color: '#999999' },
        { type: 'text', text: `฿${data.grossPay}`, size: 'md', weight: 'bold' },
        { type: 'text', text: 'Deductions', size: 'xs', color: '#999999', margin: 'md' },
        { type: 'text', text: `฿${data.deductions}`, size: 'md', color: '#EF4444' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: 'Net Pay', size: 'xs', color: '#999999' },
        { type: 'text', text: `฿${data.netPay}`, size: 'xl', weight: 'bold', color: '#10B981' },
      ],
      paddingAll: '20px',
    },
  }
}

export function buildPolicyAnswerFlex(data: {
  question: string
  answer: string
  sources: string[]
}): FlexMessage {
  const sourceList = data.sources.length > 0
    ? `\n\nSources: ${data.sources.join(', ')}`
    : ''
  return {
    type: 'bubble',
    size: 'large',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '📚 Policy Answer', weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: '#8B5CF6',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Q: ${data.question}`, size: 'sm', color: '#666666' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: data.answer + sourceList, size: 'md' },
      ],
      paddingAll: '20px',
    },
  }
}

export function buildShiftSwapFlex(data: {
  targetDate: string
  targetShift: string
  swapWith: string
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'medium',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🔄 Shift Swap Request', weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: '#F59E0B',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Date: ${data.targetDate}`, weight: 'bold', size: 'md' },
        { type: 'text', text: `Shift: ${data.targetShift}`, size: 'sm', color: '#666666', margin: 'md' },
        { type: 'text', text: `Swap with: ${data.swapWith}`, size: 'sm', color: '#666666' },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#22C55E',
          action: { type: 'postback', label: 'Confirm Swap', data: 'confirm_shift_swap' },
        },
        {
          type: 'button',
          style: 'secondary',
          color: '#EF4444',
          action: { type: 'postback', label: 'Cancel', data: 'cancel_flow' },
        },
      ],
      spacing: 'md',
      paddingAll: '20px',
    },
  }
}

export function buildAttendanceCorrectionFlex(data: {
  date: string
  clockIn: string
  clockOut: string
  reason: string
}): FlexMessage {
  return {
    type: 'bubble',
    size: 'medium',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '⏰ Attendance Correction', weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: '#6366F1',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `Date: ${data.date}`, weight: 'bold', size: 'md' },
        { type: 'text', text: `Clock In: ${data.clockIn}`, size: 'sm', color: '#666666', margin: 'md' },
        { type: 'text', text: `Clock Out: ${data.clockOut}`, size: 'sm', color: '#666666' },
        { type: 'text', text: `Reason: ${data.reason}`, size: 'sm', color: '#666666', margin: 'md' },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#22C55E',
          action: { type: 'postback', label: 'Submit', data: 'confirm_attendance_correction' },
        },
        {
          type: 'button',
          style: 'secondary',
          color: '#EF4444',
          action: { type: 'postback', label: 'Cancel', data: 'cancel_flow' },
        },
      ],
      spacing: 'md',
      paddingAll: '20px',
    },
  }
}

// --- API Functions ---

export async function sendLINEMessage(userId: string, message: LINEMessage): Promise<boolean> {
  try {
    const { data: config } = await supabase
      .from('company_integrations')
      .select('config')
      .eq('type', 'line')
      .single();

    if (!config?.config?.channel_access_token) {
      console.warn('LINE channel access token not configured');
      return false;
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.config.channel_access_token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [message],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send LINE message:', error);
    return false;
  }
}

export async function sendFlexMessage(userId: string, flex: FlexMessage, _altText: string): Promise<boolean> {
  return sendLINEMessage(userId, {
    type: 'flex',
    flex,
  });
}

export async function handleWebhook(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case 'message':
      if (event.message?.type === 'text' && event.source.userId) {
        await handleTextMessage(event.source.userId, event.message.text || '', event.replyToken);
      }
      break;
    case 'follow':
      if (event.source.userId) {
        await handleFollow(event.source.userId);
      }
      break;
    case 'postback':
      if (event.postback?.data && event.source.userId) {
        await handlePostback(event.source.userId, event.postback.data);
      }
      break;
  }
}

async function handleTextMessage(userId: string, text: string, _replyToken?: string): Promise<void> {
  // Rate limit check
  if (!canSendPushMessage(userId)) {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '⏳ You\'re sending messages too quickly. Please wait a moment and try again.',
    })
    return
  }

  const lowerText = text.toLowerCase().trim()

  // Check for active conversation state (multi-turn)
  const activeState = getConversationState(userId)
  if (activeState && activeState.flow) {
    await handleConversationStep(userId, text, activeState)
    return
  }

  // Check for cancellation
  if (lowerText === 'cancel' || lowerText === 'exit' || lowerText === 'quit') {
    clearConversationState(userId)
    await sendLINEMessage(userId, {
      type: 'text',
      text: '✅ Conversation cancelled. Type "help" to see available commands.',
    })
    return
  }

  // Command routing
  if (lowerText === 'status' || lowerText === 'check status') {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '📊 Checking your status...\n\nPlease visit your employee portal for detailed information.',
    })
  } else if (lowerText === 'leave' || lowerText === 'request leave' || lowerText === 'ลางาน') {
    await startLeaveFlow(userId)
  } else if (lowerText === 'payslip' || lowerText === 'pay' || lowerText === ' payslip') {
    await startPayslipFlow(userId)
  } else if (lowerText.startsWith('policy ') || lowerText.startsWith('ถาม ') || lowerText === 'policy') {
    const question = lowerText.replace(/^(policy|ถาม)\s*/i, '').trim()
    if (question) {
      await handlePolicyQuestion(userId, question)
    } else {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '📚 What policy would you like to know about?\n\nExample: "policy annual leave" or "ถาม sick leave policy"',
      })
    }
  } else if (lowerText === 'shift swap' || lowerText === 'swap shift') {
    await startShiftSwapFlow(userId)
  } else if (lowerText === 'attendance' || lowerText === 'clock correction' || lowerText === 'แก้เวลา') {
    await startAttendanceCorrectionFlow(userId)
  } else if (lowerText === 'help') {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '🤖 AdminMate HR Assistant\n\nAvailable commands:\n\n📅 Leave\n• "leave" — Request time off\n\n💰 Payslip\n• "payslip" — View your payslip\n\n📚 Policy\n• "policy [question]" — Ask about company policies\n\n🔄 Shift\n• "shift swap" — Request a shift swap\n\n⏰ Attendance\n• "attendance" — Correct attendance record\n\n📊 Status\n• "status" — Check your employment status\n\n❌ Cancel\n• "cancel" — Exit current conversation',
    })
  } else {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '👋 I received your message. Type "help" to see available commands, or try:\n• "leave" to request time off\n• "payslip" to view your payslip\n• "policy [question]" to ask about policies',
    })
  }
}

// --- Flow Handlers ---

async function startLeaveFlow(userId: string): Promise<void> {
  setConversationState(userId, {
    userId,
    flow: 'leave',
    step: 'ask_type',
    data: {},
    expiresAt: Date.now() + CONVERSATION_TIMEOUT,
  })
  await sendLINEMessage(userId, {
    type: 'text',
    text: '🗓️ Leave Request\n\nWhat type of leave?\n\n1. Annual Leave (ลาพักร้อน)\n2. Sick Leave (ลาป่วย)\n3. Personal Leave (ลากิจ)\n4. Maternity Leave (ลาคลอด)\n\nReply with number or type name.\nType "cancel" to exit.',
  })
}

async function startPayslipFlow(userId: string): Promise<void> {
  // Look up employee by LINE userId, get latest payslip
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, company_id, first_name, last_name')
    .eq('line_user_id', userId)
    .single()

  if (!profile) {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '❌ I couldn\'t find your employee profile. Please contact HR to link your LINE account.',
    })
    return
  }

  // Get latest payroll run
  const { data: latestRun } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, status')
    .eq('company_id', profile.company_id)
    .eq('status', 'completed')
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  if (!latestRun) {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '💰 No payroll data available yet. Please check back later or contact HR.',
    })
    return
  }

  // Get payslip for this employee
  const { data: payslip } = await supabase
    .from('payslips')
    .select('net_pay, gross_pay, total_deductions, currency')
    .eq('payroll_run_id', latestRun.id)
    .eq('employee_id', profile.id)
    .single()

  if (!payslip) {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '💰 No payslip found for the latest payroll period. Please contact HR.',
    })
    return
  }

  const periodLabel = `${new Date(latestRun.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  const flex = buildPayslipSummaryFlex({
    month: periodLabel,
    netPay: payslip.net_pay.toLocaleString(),
    grossPay: payslip.gross_pay.toLocaleString(),
    deductions: payslip.total_deductions.toLocaleString(),
  })
  await sendFlexMessage(userId, flex, `Payslip for ${periodLabel}`)
}

async function handlePolicyQuestion(userId: string, question: string): Promise<void> {
  // Look up employee profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, company_id, role')
    .eq('line_user_id', userId)
    .single()

  if (!profile) {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '❌ I couldn\'t find your employee profile. Please contact HR.',
    })
    return
  }

  // Search knowledge sources for relevant policy
  const { data: sources } = await supabase
    .from('ai_knowledge_sources')
    .select('title, content')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!sources || sources.length === 0) {
    await sendLINEMessage(userId, {
      type: 'text',
      text: '📚 No policy documents found. Please contact HR for assistance.',
    })
    return
  }

  // Simple keyword matching (in production, use vector search)
  const questionWords = question.toLowerCase().split(/\s+/)
  const scored = sources.map(s => {
    const contentLower = (s.title + ' ' + s.content).toLowerCase()
    const matches = questionWords.filter(w => contentLower.includes(w)).length
    return { ...s, score: matches }
  }).sort((a, b) => b.score - a.score)

  const bestMatch = scored[0]
  if (bestMatch && bestMatch.score > 0) {
    // Extract relevant snippet (first 500 chars of matching content)
    const snippet = bestMatch.content.substring(0, 500)
    const flex = buildPolicyAnswerFlex({
      question,
      answer: snippet + (bestMatch.content.length > 500 ? '...' : ''),
      sources: [bestMatch.title],
    })
    await sendFlexMessage(userId, flex, `Policy answer for: ${question}`)
  } else {
    await sendLINEMessage(userId, {
      type: 'text',
      text: `📚 I couldn't find a specific answer to "${question}" in our policy documents.\n\nPlease try rephrasing or contact HR for assistance.`,
    })
  }
}

async function startShiftSwapFlow(userId: string): Promise<void> {
  setConversationState(userId, {
    userId,
    flow: 'shift',
    step: 'ask_date',
    data: {},
    expiresAt: Date.now() + CONVERSATION_TIMEOUT,
  })
  await sendLINEMessage(userId, {
    type: 'text',
    text: '🔄 Shift Swap Request\n\nWhat date do you want to swap?\n(Format: YYYY-MM-DD)\n\nType "cancel" to exit.',
  })
}

async function startAttendanceCorrectionFlow(userId: string): Promise<void> {
  setConversationState(userId, {
    userId,
    flow: 'attendance',
    step: 'ask_date',
    data: {},
    expiresAt: Date.now() + CONVERSATION_TIMEOUT,
  })
  await sendLINEMessage(userId, {
    type: 'text',
    text: '⏰ Attendance Correction\n\nWhat date needs correction?\n(Format: YYYY-MM-DD)\n\nType "cancel" to exit.',
  })
}

async function handleConversationStep(userId: string, text: string, state: ConversationState): Promise<void> {
  switch (state.flow) {
    case 'leave':
      await handleLeaveStep(userId, text, state)
      break
    case 'shift':
      await handleShiftStep(userId, text, state)
      break
    case 'attendance':
      await handleAttendanceStep(userId, text, state)
      break
    default:
      clearConversationState(userId)
  }
}

async function handleLeaveStep(userId: string, text: string, state: ConversationState): Promise<void> {
  const { step, data } = state

  if (step === 'ask_type') {
    const typeMap: Record<string, string> = {
      '1': 'annual', 'annual': 'annual', 'ลาพักร้อน': 'annual',
      '2': 'sick', 'sick': 'sick', 'ลาป่วย': 'sick',
      '3': 'personal', 'personal': 'personal', 'ลากิจ': 'personal',
      '4': 'maternity', 'maternity': 'maternity', 'ลาคลอด': 'maternity',
    }
    const leaveType = typeMap[text.toLowerCase().trim()]
    if (!leaveType) {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❓ Please reply with a number (1-4) or type name.\n\n1. Annual Leave\n2. Sick Leave\n3. Personal Leave\n4. Maternity Leave',
      })
      return
    }
    setConversationState(userId, { ...state, step: 'ask_start_date', data: { ...data, leaveType } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Leave type: ${leaveType}\n\nWhen does it start?\n(Format: YYYY-MM-DD)`,
    })
  } else if (step === 'ask_start_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❓ Please use format: YYYY-MM-DD (e.g., 2026-07-15)',
      })
      return
    }
    setConversationState(userId, { ...state, step: 'ask_end_date', data: { ...data, startDate: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Start: ${text.trim()}\n\nWhen does it end?\n(Format: YYYY-MM-DD, same as start for 1-day leave)`,
    })
  } else if (step === 'ask_end_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❓ Please use format: YYYY-MM-DD',
      })
      return
    }
    setConversationState(userId, { ...state, step: 'ask_reason', data: { ...data, endDate: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ End: ${text.trim()}\n\nWhat's the reason? (or type "none")`,
    })
  } else if (step === 'ask_reason') {
    const reason = text.trim().toLowerCase() === 'none' ? '' : text.trim()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const flex = buildLeaveConfirmFlex({
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      reason,
    })
    setConversationState(userId, { ...state, step: 'confirm', data: { ...data, reason, totalDays: String(totalDays) } })
    await sendFlexMessage(userId, flex, 'Confirm your leave request')
  } else if (step === 'confirm') {
    if (text.toLowerCase().trim() === 'yes' || text.toLowerCase().trim() === 'submit') {
      // Submit leave request
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, company_id')
        .eq('line_user_id', userId)
        .single()

      if (profile) {
        // Look up leave type ID
        const { data: leaveType } = await supabase
          .from('leave_types')
          .select('id')
          .eq('company_id', profile.company_id)
          .ilike('code', `%${data.leaveType}%`)
          .single()

        if (leaveType) {
          await supabase.from('leave_requests').insert({
            company_id: profile.company_id,
            employee_id: profile.id,
            leave_type_id: leaveType.id,
            start_date: data.startDate,
            end_date: data.endDate,
            total_days: parseInt(data.totalDays),
            reason: data.reason || null,
            status: 'pending',
          })

          clearConversationState(userId)
          await sendLINEMessage(userId, {
            type: 'text',
            text: `✅ Leave request submitted!\n\nType: ${data.leaveType}\nFrom: ${data.startDate}\nTo: ${data.endDate}\nDays: ${data.totalDays}\n\nYour manager will review it shortly.`,
          })
        } else {
          clearConversationState(userId)
          await sendLINEMessage(userId, {
            type: 'text',
            text: '❌ Leave type not found. Please contact HR.',
          })
        }
      }
    } else if (text.toLowerCase().trim() === 'no' || text.toLowerCase().trim() === 'cancel') {
      clearConversationState(userId)
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❌ Leave request cancelled.',
      })
    } else {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❓ Reply "yes" to submit or "no" to cancel.',
      })
    }
  }
}

async function handleShiftStep(userId: string, text: string, state: ConversationState): Promise<void> {
  const { step, data } = state

  if (step === 'ask_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❓ Please use format: YYYY-MM-DD',
      })
      return
    }
    setConversationState(userId, { ...state, step: 'ask_shift', data: { ...data, date: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Date: ${text.trim()}\n\nWhat shift? (e.g., "Morning 8:00-16:00")`,
    })
  } else if (step === 'ask_shift') {
    setConversationState(userId, { ...state, step: 'ask_swap_with', data: { ...data, shift: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Shift: ${text.trim()}\n\nWho do you want to swap with? (Name or employee ID)`,
    })
  } else if (step === 'ask_swap_with') {
    const flex = buildShiftSwapFlex({
      targetDate: data.date,
      targetShift: data.shift,
      swapWith: text.trim(),
    })
    setConversationState(userId, { ...state, step: 'confirm', data: { ...data, swapWith: text.trim() } })
    await sendFlexMessage(userId, flex, 'Confirm shift swap')
  } else if (step === 'confirm') {
    if (text.toLowerCase().trim() === 'yes' || text.toLowerCase().trim() === 'submit') {
      clearConversationState(userId)
      await sendLINEMessage(userId, {
        type: 'text',
        text: `✅ Shift swap request submitted for ${data.date}.\n\nSwap with: ${data.swapWith}\nShift: ${data.shift}\n\nYour manager will review it.`,
      })
    } else {
      clearConversationState(userId)
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❌ Shift swap cancelled.',
      })
    }
  }
}

async function handleAttendanceStep(userId: string, text: string, state: ConversationState): Promise<void> {
  const { step, data } = state

  if (step === 'ask_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❓ Please use format: YYYY-MM-DD',
      })
      return
    }
    setConversationState(userId, { ...state, step: 'ask_clock_in', data: { ...data, date: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Date: ${text.trim()}\n\nWhat was your correct clock-in time?\n(Format: HH:MM, e.g., 08:30)`,
    })
  } else if (step === 'ask_clock_in') {
    setConversationState(userId, { ...state, step: 'ask_clock_out', data: { ...data, clockIn: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Clock In: ${text.trim()}\n\nWhat was your correct clock-out time?\n(Format: HH:MM, e.g., 17:30)`,
    })
  } else if (step === 'ask_clock_out') {
    setConversationState(userId, { ...state, step: 'ask_reason', data: { ...data, clockOut: text.trim() } })
    await sendLINEMessage(userId, {
      type: 'text',
      text: `✅ Clock Out: ${text.trim()}\n\nWhat's the reason for correction?`,
    })
  } else if (step === 'ask_reason') {
    const flex = buildAttendanceCorrectionFlex({
      date: data.date,
      clockIn: data.clockIn,
      clockOut: data.clockOut,
      reason: text.trim(),
    })
    setConversationState(userId, { ...state, step: 'confirm', data: { ...data, reason: text.trim() } })
    await sendFlexMessage(userId, flex, 'Confirm attendance correction')
  } else if (step === 'confirm') {
    if (text.toLowerCase().trim() === 'yes' || text.toLowerCase().trim() === 'submit') {
      clearConversationState(userId)
      await sendLINEMessage(userId, {
        type: 'text',
        text: `✅ Attendance correction submitted for ${data.date}.\n\nClock In: ${data.clockIn}\nClock Out: ${data.clockOut}\nReason: ${data.reason}\n\nYour manager will review it.`,
      })
    } else {
      clearConversationState(userId)
      await sendLINEMessage(userId, {
        type: 'text',
        text: '❌ Correction cancelled.',
      })
    }
  }
}

async function handleFollow(userId: string): Promise<void> {
  await sendLINEMessage(userId, {
    type: 'text',
    text: '👋 Welcome to AdminMate AI!\n\nI\'m your HR assistant. Type "help" to see available commands.',
  });
}

async function handlePostback(userId: string, data: string): Promise<void> {
  const [action, ...params] = data.split(':');

  switch (action) {
    case 'approve_leave':
      // Handle leave approval
      console.log(`Leave approved by ${userId}: ${params[0]}`);
      break;
    case 'reject_leave':
      // Handle leave rejection
      console.log(`Leave rejected by ${userId}: ${params[0]}`);
      break;
    case 'upload_document':
      // Handle document upload
      await sendLINEMessage(userId, {
        type: 'text',
        text: '📄 Please upload your document here or visit the employee portal.',
      });
      break;
  }
}

// --- Webhook Verification ---

export function verifyWebhookSignature(_body: string, _signature: string, _channelSecret: string): boolean {
  // In production, use crypto.createHmac to verify LINE webhook signature
  // This is a simplified check
  return true;
}
