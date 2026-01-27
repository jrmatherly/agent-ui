import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { siemExporter, SIEMFormat } from '@/lib/audit/siemExporter'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permission
  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const format = (searchParams.get('format') || 'json') as SIEMFormat
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate required' },
      { status: 400 }
    )
  }

  const data = await siemExporter.exportEvents(
    session.session.activeOrganizationId!,
    {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format
    }
  )

  const contentType = format === 'json' ? 'application/json' : 'text/plain'
  const filename = `audit-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'txt'}`

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
