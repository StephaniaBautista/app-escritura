import { Users } from 'lucide-react'

export function SharedPage() {
  return (
    <div className="p-6 md:p-8">
      <div>
        <h1 className="font-display text-4xl font-bold mb-6" style={{ color: 'var(--color-ink)' }}>Compartidos conmigo</h1>
        <div className="notebook-paper p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-teal)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>Próximamente</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
            Aquí aparecerán los documentos que otros compartan contigo
          </p>
        </div>
      </div>
    </div>
  )
}
