import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCorsPreflight, getJsonHeaders } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { handleLogin } from './login.ts'
import { handleRefresh } from './refresh.ts'
import { handleLogout } from './logout.ts'
import { handleStatus } from './status.ts'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const path = '/' + (req.url.match(/auth-session\/(.+)$/)?.[1] || '')

    if (req.method === 'POST' && path === '/login') return await handleLogin(req)
    if (req.method === 'POST' && path === '/refresh') return await handleRefresh(req)
    if (req.method === 'POST' && path === '/logout') return await handleLogout(req)
    if (req.method === 'GET' && path === '/status') return await handleStatus(req)

    return new Response(
      JSON.stringify({ success: false, error: 'Not found' }),
      { status: 404, headers: getJsonHeaders(req) }
    )
  } catch (error: unknown) {
    return errorResponse(error, 500, getJsonHeaders(req))
  }
})
