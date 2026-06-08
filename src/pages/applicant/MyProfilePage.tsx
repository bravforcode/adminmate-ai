import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { LogOut, UserCircle, Phone, MapPin, Briefcase, Mail, Save } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  full_name_th: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  current_position: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export function MyProfilePage() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const { setProfile, reset } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name ?? '',
      full_name_th: (profile as unknown as Record<string, string>)?.full_name_th ?? '',
      phone: (profile as unknown as Record<string, string>)?.phone ?? '',
      location: (profile as unknown as Record<string, string>)?.location ?? '',
      current_position: (profile as unknown as Record<string, string>)?.current_position ?? '',
    },
  })

  const onSubmit = async (data: ProfileForm) => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          full_name_th: data.full_name_th,
        })
        .eq('id', profile.id)

      if (error) throw error

      // Also update candidate record if exists
      if (profile.email) {
        await supabase
          .from('candidates')
          .update({
            full_name: data.full_name,
            phone: data.phone || null,
            location: data.location || null,
            current_position: data.current_position || null,
          })
          .eq('email', profile.email)
      }

      setProfile({ ...profile, full_name: data.full_name } as never)
      toast.success('Profile updated successfully')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      reset()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">My Profile</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your personal information</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg text-sm hover:bg-error-container hover:text-error hover:border-error transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Avatar + Role badge */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-3xl font-bold">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{profile?.full_name}</h2>
            <p className="text-sm text-on-surface-variant">{profile?.email}</p>
            <span className="mt-2 inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-semibold rounded-full capitalize">
              {profile?.role || 'Applicant'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-surface-container">
          <UserCircle size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-on-surface">Personal Information</h3>
        </div>

        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">
                Full Name (EN) *
              </label>
              <input
                {...register('full_name')}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Your full name"
              />
              {errors.full_name && <p className="text-error text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">
                Full Name (TH)
              </label>
              <input
                {...register('full_name_th')}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="ชื่อ - นามสกุล"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-on-surface-variant">
                <Phone size={13} />
                Phone Number
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="+66 8x-xxx-xxxx"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-on-surface-variant">
                <MapPin size={13} />
                Location / City
              </label>
              <input
                {...register('location')}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Bangkok, Thailand"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-on-surface-variant">
              <Briefcase size={13} />
              Current Position / Job Title
            </label>
            <input
              {...register('current_position')}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="e.g. Frontend Developer"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1 text-on-surface-variant">
              <Mail size={13} />
              Email Address
            </label>
            <input
              value={profile?.email ?? ''}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant outline-none cursor-not-allowed"
            />
            <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed here.</p>
          </div>
        </form>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="submit"
          form="profile-form"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50 shadow-sm transition-opacity"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default MyProfilePage
