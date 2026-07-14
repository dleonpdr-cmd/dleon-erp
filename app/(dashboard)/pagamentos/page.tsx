// ============================================================
// D'LEON ERP — Página: /pagamentos
// Server Component — Next.js 14 App Router
// ============================================================
import { Suspense } from 'react'
import { listarFaturas, listarComissoes, listarOsParaFaturar, resumoPagamentos } from '@/lib/pagamentos'
import MetricasCards from '@/components/pagamentos/MetricasCards'
import TabelaFaturas from '@/components/pagamentos/TabelaFaturas'
import TabelaComissoes from '@/components/pagamentos/TabelaComissoes'
import OsParaFaturarCard from '@/components/pagamentos/OsParaFaturarCard'
import NoveFaturaBtn from '@/components/pagamentos/NovaFaturaBtn'

export const metadata = { title: 'Pagamentos — D\'LEON ERP' }

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mes?: string }>
}) {
  const mesAtual = searchParams.mes || new Date().toISOString().slice(0, 7)

  const [faturas, comissoes, osProntas, resumo] = await Promise.all([
    listarFaturas({ status: searchParams.status, mes: mesAtual }),
    listarComissoes({ mes: mesAtual }),
    listarOsParaFaturar(),
    resumoPagamentos(1),
  ])

  const res = resumo[0] ?? {
    faturamento_total: 0, recebido: 0, a_receber: 0, vencido: 0, total_faturas: 0,
  }

  const totalComissoesPendentes = comissoes
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor_comissao, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Pagamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(mesAtual + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <NoveFaturaBtn osProntas={osProntas} />
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-lg" />}>
        <MetricasCards
          faturamento={res.faturamento_total}
          recebido={res.recebido}
          aReceber={res.a_receber}
          comissoesPendentes={totalComissoesPendentes}
          osProntas={osProntas.length}
        />
      </Suspense>

      {osProntas.length > 0 && (
        <Suspense fallback={null}>
          <OsParaFaturarCard itens={osProntas} />
        </Suspense>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
          <TabelaFaturas faturas={faturas} />
        </Suspense>

        <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
          <TabelaComissoes comissoes={comissoes} />
        </Suspense>
      </div>
    </div>
  )
}
