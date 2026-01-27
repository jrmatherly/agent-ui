import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Bases - Agent UI',
  description: 'Manage your team knowledge bases'
}

export default function KnowledgeLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
