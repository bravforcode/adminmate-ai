import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../lib/utils'
import { LoadingState } from '../../components/shared/LoadingState'
import { EmptyState } from '../../components/shared/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import {
  MessageSquare, Send, Clock, CheckCircle, XCircle, AlertCircle,
  Search, FileText, Mail, MessageCircle,
} from 'lucide-react'
import {
  getTemplates, deleteTemplate, toggleTemplateActive,
} from '../../services/messaging/messageTemplateService'
import {
  getDrafts, submitForApproval, cancelDraft, deleteDraft,
  type DraftStatus,
} from '../../services/messaging/messageDraftService'
import {
  getPendingApprovals, approveMessage, rejectMessage,
} from '../../services/messaging/messageApprovalService'
import type { MessageChannel } from '../../services/messaging/providers/types'

/* ============================================================
   AdminMate AI — Messages Page
   Route: /messages
   ============================================================ */

const CHANNEL_ICONS: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  line: MessageCircle,
  whatsapp: MessageCircle,
  sms: Send,
  facebook: MessageCircle,
  in_app: MessageSquare,
}

const STATUS_COLORS: Record<DraftStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sent: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function MessagesPage() {
  const { t } = useTranslation(['common', 'reports'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('drafts')
  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState<MessageChannel | 'all'>('all')
  const [statusFilter] = useState<DraftStatus | 'all'>('all')

  const companyId = company?.id ?? ''
  const userId = profile?.id ?? ''

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['messageTemplates', companyId],
    queryFn: () => getTemplates(companyId),
    enabled: !!companyId,
  })

  const { data: drafts = [], isLoading: draftsLoading } = useQuery({
    queryKey: ['messageDrafts', companyId, statusFilter],
    queryFn: () => getDrafts(companyId, statusFilter === 'all' ? undefined : statusFilter),
    enabled: !!companyId,
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ['messageApprovals', companyId],
    queryFn: () => getPendingApprovals(companyId),
    enabled: !!companyId,
  })

  const submitMutation = useMutation({
    mutationFn: (draftId: string) => submitForApproval(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageDrafts'] })
      queryClient.invalidateQueries({ queryKey: ['messageApprovals'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (draftId: string) => cancelDraft(draftId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageDrafts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (draftId: string) => deleteDraft(draftId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageDrafts'] }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ approvalId, reason }: { approvalId: string; reason?: string }) =>
      approveMessage(approvalId, userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['messageDrafts'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, reason }: { approvalId: string; reason: string }) =>
      rejectMessage(approvalId, userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['messageDrafts'] })
    },
  })

  const toggleTemplateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleTemplateActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }),
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }),
  })

  const filteredDrafts = drafts.filter(d => {
    if (channelFilter !== 'all' && d.channel !== channelFilter) return false
    if (searchQuery && !d.body.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(d.subject ?? '').toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredTemplates = templates.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const isLoading = templatesLoading || draftsLoading || approvalsLoading

  if (isLoading && !drafts.length) {
    return <LoadingState variant="cards" rows={4} message={t('common:loading')} />
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-background">{t('messages.title', 'Messages')}</h1>
          <p className="text-sm text-ink-variant mt-1">{t('messages.subtitle', 'Manage message templates, drafts, and approvals')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant" />
            <Input
              placeholder={t('common:search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as MessageChannel | 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('messages.channel', 'Channel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('messages.all_channels', 'All Channels')}</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="line">LINE</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="in_app">{t('messages.in_app', 'In-App')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <FileText size={16} /> {t('messages.drafts', 'Drafts')}
            {drafts.length > 0 && <Badge variant="secondary" className="ml-1">{drafts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <AlertCircle size={16} /> {t('messages.approvals', 'Approvals')}
            {approvals.length > 0 && <Badge variant="destructive" className="ml-1">{approvals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText size={16} /> {t('messages.templates', 'Templates')}
          </TabsTrigger>
        </TabsList>

        {/* Drafts Tab */}
        <TabsContent value="drafts" className="space-y-4">
          {filteredDrafts.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t('messages.no_drafts', 'No drafts')}
              description={t('messages.no_drafts_desc', 'Create a new message draft to get started')}
            />
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map((draft) => {
                const ChannelIcon = CHANNEL_ICONS[draft.channel] ?? MessageSquare
                return (
                  <Card key={draft.id} className="p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ChannelIcon size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-ink">{draft.channel.toUpperCase()}</span>
                            <Badge className={cn('text-xs', STATUS_COLORS[draft.status])}>
                              {draft.status.replace(/_/g, ' ')}
                            </Badge>
                            {draft.ai_generated && (
                              <Badge variant="secondary" className="text-xs">AI</Badge>
                            )}
                          </div>
                          {draft.subject && (
                            <p className="text-sm font-medium text-ink mb-1">{draft.subject}</p>
                          )}
                          <p className="text-sm text-ink-variant line-clamp-2">{draft.body}</p>
                          <p className="text-xs text-ink-variant mt-2">
                            {t('messages.to', 'To')}: {draft.recipient_type} • {new Date(draft.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {draft.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => submitMutation.mutate(draft.id)}
                              disabled={submitMutation.isPending}
                            >
                              {t('messages.submit_approval', 'Submit for Approval')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(draft.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <XCircle size={16} />
                            </Button>
                          </>
                        )}
                        {draft.status === 'pending_approval' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(draft.id)}
                            disabled={cancelMutation.isPending}
                          >
                            {t('messages.cancel', 'Cancel')}
                          </Button>
                        )}
                        {draft.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => submitMutation.mutate(draft.id)}
                            disabled={submitMutation.isPending}
                          >
                            {t('messages.resubmit', 'Resubmit')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {approvals.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title={t('messages.no_approvals', 'No pending approvals')}
              description={t('messages.no_approvals_desc', 'All messages have been reviewed')}
            />
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => (
                <Card key={approval.id} className="p-4 border-yellow-200 hover:border-yellow-400 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-yellow-600" />
                        <span className="text-sm font-medium text-ink">
                          {t('messages.pending_approval', 'Pending Approval')}
                        </span>
                        <span className="text-xs text-ink-variant">
                          {new Date(approval.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-ink-variant">
                        {t('messages.draft_id', 'Draft')}: {approval.message_draft_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => approveMutation.mutate({ approvalId: approval.id })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        {t('messages.approve', 'Approve')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const reason = prompt(t('messages.reject_reason', 'Enter rejection reason:'))
                          if (reason && reason.trim().length >= 3) {
                            rejectMutation.mutate({ approvalId: approval.id, reason })
                          }
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle size={16} className="mr-1" />
                        {t('messages.reject', 'Reject')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t('messages.no_templates', 'No templates')}
              description={t('messages.no_templates_desc', 'Create message templates for consistent communication')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const ChannelIcon = CHANNEL_ICONS[template.default_channel] ?? MessageSquare
                return (
                  <Card key={template.id} className="p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ChannelIcon size={16} className="text-primary" />
                        <span className="text-sm font-medium text-ink">{template.name}</span>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                        {template.is_active ? t('messages.active', 'Active') : t('messages.inactive', 'Inactive')}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-variant mb-3 line-clamp-2">
                      {template.description ?? template.body_template.slice(0, 100)}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{template.language_code}</Badge>
                        <Badge variant="outline" className="text-xs">{template.default_channel}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTemplateMutation.mutate({
                            id: template.id,
                            isActive: !template.is_active,
                          })}
                        >
                          {template.is_active ? t('messages.deactivate', 'Deactivate') : t('messages.activate', 'Activate')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(t('messages.confirm_delete_template', 'Delete this template?'))) {
                              deleteTemplateMutation.mutate(template.id)
                            }
                          }}
                        >
                          <XCircle size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
