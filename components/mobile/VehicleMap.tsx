'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveVehicleMapPanel } from '@/app/api/estimativas/actions'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type PanelState = 'none' | 'ok' | 'light' | 'severe'

interface PanelData {
  state: PanelState
  price: number // yen inteiro
  damageLevel: 'Leve' | 'Médio' | 'Grave' | null
}

interface PanelDef {
  id: string
  name: string
  svgPath: string
  dx: number  // desktop x
  dy: number  // desktop y
  mx: number  // mobile x
  my: number  // mobile y
  tagLeft: boolean
}

interface VehicleMapItem {
  part_id: string
  damage_level: string | null
  unit_price: number
}

interface VehicleMapProps {
  documentId: string
  initialItems: VehicleMapItem[]
  vehicleLabel: string    // "CD-5678 · Honda Fit"
  operationLabel: string  // "OP-2026-08 · Kansai"
  approvalStatus: string
}

// ─── Dados dos painéis (SVG viewBox 0 0 1024 1536) ───────────────────────────

const PANELS: PanelDef[] = [
  {
    id: 'hood', name: 'Capô',
    svgPath: 'M357 116 C431 94 593 94 667 116 C701 139 724 178 736 224 C748 274 751 324 741 365 C729 392 699 413 660 427 C564 444 460 444 364 427 C325 413 295 392 283 365 C273 324 276 274 288 224 C300 178 323 139 357 116 Z',
    dx: 250, dy: 146, mx: 195, my: 114, tagLeft: false,
  },
  {
    id: 'lf', name: 'Para-lama dianteiro esquerdo',
    svgPath: 'M340 129 C312 145 289 182 274 228 C261 277 258 347 262 410 C265 451 270 482 278 502 L284 497 C279 453 278 408 281 363 C279 315 284 264 296 218 C307 175 323 142 340 129 Z',
    dx: 113, dy: 164, mx: 88, my: 128, tagLeft: true,
  },
  {
    id: 'rf', name: 'Para-lama dianteiro direito',
    svgPath: 'M684 129 C712 145 735 182 750 228 C763 277 766 347 762 410 C759 451 754 482 746 502 L740 497 C745 453 746 408 743 363 C745 315 740 264 728 218 C717 175 701 142 684 129 Z',
    dx: 387, dy: 164, mx: 302, my: 128, tagLeft: false,
  },
  {
    id: 'ld', name: 'Porta dianteira esquerda',
    svgPath: 'M265 574 C251 603 246 647 245 700 L247 747 L285 744 L286 589 Z',
    dx: 112, dy: 317, mx: 87, my: 247, tagLeft: true,
  },
  {
    id: 'lrd', name: 'Porta traseira esquerda',
    svgPath: 'M247 755 L285 752 L285 918 L269 927 C257 911 251 888 249 858 Z',
    dx: 112, dy: 410, mx: 87, my: 320, tagLeft: true,
  },
  {
    id: 'rd', name: 'Porta dianteira direita',
    svgPath: 'M759 574 C773 603 778 647 779 700 L777 747 L739 744 L738 589 Z',
    dx: 388, dy: 317, mx: 303, my: 247, tagLeft: false,
  },
  {
    id: 'rrd', name: 'Porta traseira direita',
    svgPath: 'M777 755 L739 752 L739 918 L755 927 C767 911 773 888 775 858 Z',
    dx: 388, dy: 410, mx: 303, my: 320, tagLeft: false,
  },
  {
    id: 'roof', name: 'Teto',
    svgPath: 'M337 490 C391 472 633 472 687 490 L704 557 L684 1090 C631 1109 393 1109 340 1090 L320 557 Z',
    dx: 250, dy: 425, mx: 195, my: 332, tagLeft: false,
  },
  {
    id: 'lq', name: 'Lateral traseira esquerda',
    svgPath: 'M269 951 L286 938 L292 1117 C289 1169 277 1208 258 1232 C249 1208 245 1178 245 1143 L247 1015 Z',
    dx: 111, dy: 560, mx: 87, my: 437, tagLeft: true,
  },
  {
    id: 'rq', name: 'Lateral traseira direita',
    svgPath: 'M755 951 L738 938 L732 1117 C735 1169 747 1208 766 1232 C775 1208 779 1178 779 1143 L777 1015 Z',
    dx: 389, dy: 560, mx: 303, my: 437, tagLeft: false,
  },
  {
    id: 'trunk', name: 'Porta-malas',
    svgPath: 'M320 1322 C366 1344 435 1357 512 1357 C589 1357 658 1344 704 1322 L718 1367 C672 1402 604 1418 512 1419 C420 1418 352 1402 306 1367 Z',
    dx: 250, dy: 608, mx: 195, my: 474, tagLeft: false,
  },
  {
    id: 'rear', name: 'Para-choque traseiro',
    svgPath: 'M287 1350 C345 1380 418 1393 512 1395 C606 1393 679 1380 737 1350 C731 1377 712 1397 680 1410 C633 1428 577 1437 512 1438 C447 1437 391 1428 344 1410 C312 1397 293 1377 287 1350 Z',
    dx: 250, dy: 690, mx: 195, my: 538, tagLeft: false,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stateFromItem(item: VehicleMapItem | undefined): PanelState {
  if (!item) return 'none'
  if (!item.damage_level && item.unit_price === 0) return 'ok'
  if (item.damage_level === 'Leve') return 'light'
  return 'severe'
}

function damageLevelFromState(state: PanelState): 'Leve' | 'Médio' | 'Grave' | null {
  if (state === 'light') return 'Leve'
  if (state === 'severe') return 'Médio'
  return null
}

function fmtPrice(yen: number): string {
  return '¥' + yen.toLocaleString('ja-JP')
}

function panelColor(state: PanelState): string {
  switch (state) {
    case 'ok': return '#14ce83'
    case 'light': return '#ff7100'
    case 'severe': return '#ff284e'
    default: return '#7c8288'
  }
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function VehicleMap({
  documentId,
  initialItems,
  vehicleLabel,
  operationLabel,
  approvalStatus,
}: VehicleMapProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Estado dos painéis
  const [panels, setPanels] = useState<Record<string, PanelData>>(() => {
    const map: Record<string, PanelData> = {}
    for (const p of PANELS) {
      const item = initialItems.find(i => i.part_id === p.id)
      const state = stateFromItem(item)
      map[p.id] = {
        state,
        price: item?.unit_price ?? 0,
        damageLevel: damageLevelFromState(state),
      }
    }
    return map
  })

  // Sheet (bottom drawer)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [chosenState, setChosenState] = useState<PanelState>('none')
  const [inputPrice, setInputPrice] = useState('')

  // Zoom
  const [zoom, setZoom] = useState(1)

  // Toast
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1600)
  }

  const openSheet = (id: string) => {
    const p = panels[id]
    setActiveId(id)
    setChosenState(p.state)
    setInputPrice(p.price > 0 ? String(Math.round(p.price / 1000)) : '')
  }

  const closeSheet = () => setActiveId(null)

  const handleSave = () => {
    if (!activeId) return
    const panel = PANELS.find(p => p.id === activeId)!
    const price = chosenState === 'ok' ? 0 : (parseInt(inputPrice || '0', 10) * 1000)
    const damageLevel = damageLevelFromState(chosenState)

    // Update local state immediately
    setPanels(prev => ({
      ...prev,
      [activeId]: { state: chosenState, price, damageLevel },
    }))
    closeSheet()
    showToast('Avaliação atualizada')

    // Persist to DB
    startTransition(async () => {
      const result = await saveVehicleMapPanel({
        documentId,
        partId: activeId,
        partLabel: panel.name,
        state: chosenState,
        price,
        damageLevel,
      })
      if (result.error) showToast('Erro: ' + result.error)
      else router.refresh()
    })
  }

  const handleOtherPanel = () => {
    const next = PANELS.find(p => panels[p.id]?.state === 'none')
    if (next) openSheet(next.id)
  }

  const handleReview = () => {
    router.push(`/mobile/estimativa/${documentId}/revisao`)
  }

  // Totais
  const evaluated = PANELS.filter(p => panels[p.id]?.state !== 'none').length
  const remaining = PANELS.length - evaluated
  const total = PANELS.reduce((sum, p) => sum + (panels[p.id]?.price ?? 0), 0)

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 560

  return (
    <>
      <style>{`
        :root {
          --vm-bg: #03070a;
          --vm-card: #0c1217;
          --vm-line: #202b34;
          --vm-muted: #87909d;
          --vm-text: #f4f6f8;
          --vm-orange: #ff6900;
          --vm-green: #14ce83;
          --vm-red: #ff3554;
          --vm-gray: #7c8288;
          --vm-safe: env(safe-area-inset-bottom, 0px);
        }
        .vm-app {
          width: min(100%, 760px);
          min-height: 100dvh;
          margin: auto;
          padding-bottom: 112px;
          background: radial-gradient(ellipse at 50% 38%, #0a151a 0, #03080b 44%, #010304 78%);
          overflow: hidden;
          color: var(--vm-text);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .vm-head { padding: 12px 18px 0; }
        .vm-headbox {
          height: 68px; border: 1px solid #14222b; border-radius: 25px;
          padding: 10px 17px; display: flex; align-items: center; gap: 14px;
          background: linear-gradient(135deg, #091116dd, #05090ccd);
          box-shadow: inset 0 1px #1b2b333d;
        }
        .vm-back {
          width: 48px; height: 48px; border: 0; border-radius: 50%;
          background: #111b21; color: #fff; font-size: 28px; line-height: 1; cursor: pointer;
        }
        .vm-title { min-width: 0; flex: 1; }
        .vm-title b { display: block; font-size: 20px; letter-spacing: -.03em; }
        .vm-title span { display: block; margin-top: 3px; color: #79828e; font-size: 13px; }
        .vm-saved { font-size: 14px; color: var(--vm-green); font-weight: 700; white-space: nowrap; }
        .vm-saved i { font-style: normal; font-size: 22px; margin-right: 7px; }

        .vm-flow { display: flex; padding: 20px 29px 15px; }
        .vm-step {
          flex: 1; position: relative; text-align: center;
          color: #7e8792; font-size: 10px;
        }
        .vm-step:before {
          content: ""; display: block; width: 16px; height: 16px; border-radius: 50%;
          margin: 0 auto 7px; background: #26313a; box-shadow: 0 0 0 3px #03080b;
        }
        .vm-step:not(:last-child):after {
          content: ""; height: 3px; position: absolute;
          left: calc(50% + 11px); right: calc(-50% + 11px); top: 7px; background: #253039;
        }
        .vm-step.active { color: var(--vm-orange); }
        .vm-step.active:before {
          background: var(--vm-orange);
          box-shadow: 0 0 0 3px #03080b, 0 0 14px #ff690077;
        }

        .vm-legend {
          margin: 0 18px; height: 39px; padding: 0 19px;
          border: 1px solid #1e2a32; border-radius: 22px;
          display: flex; align-items: center; justify-content: space-between;
          background: #0b1217dd; overflow: auto; gap: 18px;
        }
        .vm-key { display: flex; align-items: center; gap: 8px; white-space: nowrap; color: #bdc3cb; font-size: 10px; }
        .vm-sw { width: 15px; height: 15px; border-radius: 50%; background: var(--vm-gray); flex-shrink: 0; }
        .vm-sw.ok { background: var(--vm-green); }
        .vm-sw.light { background: #ff7800; }
        .vm-sw.severe { background: var(--vm-red); }
        .vm-sw.na { background: repeating-linear-gradient(135deg, #aab0b5 0 2px, transparent 2px 4px); }

        .vm-view-row {
          height: 60px; display: flex; justify-content: flex-end;
          align-items: center; padding: 0 18px;
        }
        .vm-views {
          height: 39px; border: 1px solid #293640; border-radius: 20px;
          padding: 0 16px; background: #081015cc; color: #e7eaed; font-size: 11px; cursor: pointer;
        }

        .vm-stage { height: 830px; position: relative; touch-action: none; }
        .vm-vehicle {
          position: absolute; width: 500px; height: 750px;
          left: 50%; top: 0;
          transform: translateX(-50%) scale(var(--vm-zoom, 1));
          transform-origin: 50% 45%;
          transition: transform .25s ease;
        }
        .vm-car-photo {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; pointer-events: none; user-select: none;
          filter: contrast(1.05) saturate(.9);
        }
        .vm-zones {
          position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;
        }
        .vm-zone {
          cursor: pointer; opacity: .72; mix-blend-mode: screen;
          transition: fill .2s, stroke .2s, filter .2s;
          fill: #7c828844; stroke: #b5bbc0; stroke-width: 3; vector-effect: non-scaling-stroke;
        }
        .vm-zone[data-state="ok"] {
          fill: #00d77da8; stroke: #34f5a1; filter: drop-shadow(0 0 10px #00d77d);
        }
        .vm-zone[data-state="light"] {
          fill: #ff7100a8; stroke: #ff8b22; filter: drop-shadow(0 0 10px #ff7100);
        }
        .vm-zone[data-state="severe"] {
          fill: #ff284ea8; stroke: #ff5b73; filter: drop-shadow(0 0 11px #ff284e);
        }
        .vm-zone.selected {
          opacity: .9; stroke: #fff; stroke-width: 5;
          filter: brightness(1.25) drop-shadow(0 0 12px #fff);
        }

        .vm-mark {
          position: absolute; z-index: 4;
          transform: translate(-50%, -50%);
          width: 27px; height: 27px; border-radius: 50%;
          border: 3px solid #fff; background: #6e7378; color: white;
          display: grid; place-items: center; font-size: 14px; font-weight: 900;
          box-shadow: 0 0 0 3px #ffffff25, 0 3px 10px #000;
          cursor: pointer;
        }
        .vm-mark[data-state="ok"] {
          background: var(--vm-green);
          box-shadow: 0 0 0 3px #17db8860, 0 0 13px #14ce83;
        }
        .vm-mark[data-state="light"] {
          background: #ff7000;
          box-shadow: 0 0 0 3px #ff700055, 0 0 13px #ff7000;
        }
        .vm-mark[data-state="severe"] {
          background: var(--vm-red);
          box-shadow: 0 0 0 3px #ff355455, 0 0 13px #ff3554;
        }
        .vm-tag {
          position: absolute; top: 50%; left: 36px;
          transform: translateY(-50%);
          border: 1px solid currentColor; border-radius: 14px;
          padding: 5px 14px; background: #081015ee;
          color: #e6eaee; font-size: 11px; white-space: nowrap;
        }
        .vm-mark.tag-left .vm-tag { left: auto; right: 36px; }
        .vm-mark[data-state="ok"] .vm-tag { color: #eafff7; border-color: var(--vm-green); }
        .vm-mark[data-state="light"] .vm-tag { border-color: #ff7000; }
        .vm-mark[data-state="severe"] .vm-tag { border-color: var(--vm-red); }

        .vm-side-tools {
          position: absolute; left: 20px; bottom: 20px;
          display: flex; flex-direction: column; gap: 12px; z-index: 5;
        }
        .vm-tool {
          width: 124px; height: 54px;
          border: 1px solid #2b3944; border-radius: 18px;
          background: #0a1117dd; color: #eef1f4;
          box-shadow: 0 8px 24px #0008;
          text-align: left; padding-left: 22px; font-size: 12px; cursor: pointer;
        }
        .vm-tool b { font-size: 21px; margin-right: 15px; }
        .vm-other {
          position: absolute; right: 18px; bottom: 20px;
          height: 54px; padding: 0 24px;
          border: 1px solid #2b3944; border-radius: 18px;
          background: #0a1117dd; color: #eef1f4;
          box-shadow: 0 8px 24px #0008;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .vm-other b { font-size: 28px; margin-right: 13px; font-weight: 300; }

        .vm-bottom {
          position: fixed; z-index: 20;
          left: 50%; bottom: 0; transform: translateX(-50%);
          width: min(760px, 100%); height: 105px;
          padding: 14px 18px calc(14px + var(--vm-safe));
          display: grid; grid-template-columns: 1fr 1fr 1.25fr 1.2fr;
          background: #091015f2; border: 1px solid #22303a;
          border-radius: 28px 28px 0 0;
          backdrop-filter: blur(16px);
          box-shadow: 0 -12px 45px #000;
        }
        .vm-metric {
          display: flex; align-items: center; gap: 12px;
          padding: 0 12px; border-right: 1px solid #202a32;
        }
        .vm-metric-icon {
          width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%;
          display: grid; place-items: center;
          background: #17242a; color: var(--vm-green); font-size: 22px;
        }
        .vm-metric-icon.gray { color: #c0c6cb; background: #1b2229; }
        .vm-metric-icon.yen { color: var(--vm-orange); background: #2c2018; }
        .vm-metric b { display: block; font-size: 19px; white-space: nowrap; }
        .vm-metric small { display: block; font-size: 10px; color: #9199a3; margin-top: 3px; }
        .vm-metric.total b { color: var(--vm-orange); }
        .vm-review {
          margin-left: 14px; border: 0; border-radius: 18px;
          background: linear-gradient(135deg, #ff7b00, #ff4e00);
          color: #fff; font-weight: 800; font-size: 14px;
          box-shadow: 0 8px 22px #ff5b0044; cursor: pointer;
          font-family: inherit;
        }

        .vm-scrim {
          position: fixed; inset: 0; z-index: 29;
          background: #000a; opacity: 0; pointer-events: none; transition: .2s;
        }
        .vm-scrim.open { opacity: 1; pointer-events: auto; }
        .vm-sheet {
          position: fixed; z-index: 30; left: 50%; bottom: 0;
          width: min(520px, 100%);
          transform: translate(-50%, 110%); transition: .25s;
          padding: 10px 18px calc(20px + var(--vm-safe));
          border: 1px solid #27343d; border-bottom: 0;
          border-radius: 24px 24px 0 0;
          background: #0d151a; box-shadow: 0 -20px 50px #000;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .vm-sheet.open { transform: translate(-50%, 0); }
        .vm-handle {
          width: 40px; height: 4px; border-radius: 4px;
          background: #39434a; margin: 0 auto 14px;
        }
        .vm-sheethead {
          display: flex; align-items: center; justify-content: space-between;
        }
        .vm-sheethead h2 { font-size: 18px; margin: 0; color: var(--vm-text); }
        .vm-close {
          border: 0; width: 32px; height: 32px; border-radius: 50%;
          background: #1b252c; color: #aaa; font-size: 22px; cursor: pointer;
        }
        .vm-states {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 15px;
        }
        .vm-state {
          border: 1px solid #28343d; border-radius: 12px;
          background: #111a20; color: #8d969e;
          padding: 10px 3px; font-size: 9px; text-align: center; cursor: pointer;
          font-family: inherit;
        }
        .vm-state i {
          display: block; width: 13px; height: 13px; border-radius: 50%;
          background: var(--vm-gray); margin: 0 auto 7px;
        }
        .vm-state[data-s="ok"] i { background: var(--vm-green); }
        .vm-state[data-s="light"] i { background: var(--vm-orange); }
        .vm-state[data-s="severe"] i { background: var(--vm-red); }
        .vm-state.active { border-color: #fff; color: #fff; }
        .vm-price-row {
          margin-top: 12px; display: flex; align-items: center;
          border: 1px solid #28343d; border-radius: 12px;
          background: #071015; padding: 0 14px; color: #8b949c;
        }
        .vm-price-row input {
          width: 100%; border: 0; outline: 0; background: transparent;
          color: #fff; padding: 13px 8px; font-family: inherit; font-size: 15px;
        }
        .vm-save {
          width: 100%; margin-top: 12px; padding: 13px; border: 0; border-radius: 12px;
          background: linear-gradient(135deg, #ff7b00, #ff4e00);
          color: #fff; font-weight: 800; font-size: 15px; cursor: pointer;
          font-family: inherit; opacity: 1; transition: opacity .15s;
        }
        .vm-save:disabled { opacity: .6; cursor: not-allowed; }
        .vm-toast {
          position: fixed; z-index: 40; left: 50%; bottom: 120px;
          transform: translate(-50%, 12px); opacity: 0;
          padding: 9px 14px; border-radius: 10px;
          background: white; color: #111; font-size: 11px; transition: .2s;
          pointer-events: none;
          font-family: Inter, -apple-system, sans-serif;
        }
        .vm-toast.show { opacity: 1; transform: translate(-50%, 0); }

        @media (max-width: 560px) {
          .vm-app { padding-bottom: 91px; }
          .vm-head { padding: 9px 10px 0; }
          .vm-headbox { height: 62px; border-radius: 21px; }
          .vm-back { width: 42px; height: 42px; }
          .vm-title b { font-size: 17px; }
          .vm-title span { font-size: 11px; }
          .vm-saved { font-size: 12px; }
          .vm-flow { padding: 15px 15px 12px; }
          .vm-legend { margin: 0 10px; padding: 0 13px; gap: 16px; justify-content: flex-start; }
          .vm-view-row { height: 52px; padding: 0 10px; }
          .vm-stage { height: 610px; }
          .vm-vehicle { width: 390px; height: 585px; }
          .vm-side-tools { left: 10px; bottom: 5px; gap: 8px; }
          .vm-tool { width: 105px; height: 43px; border-radius: 15px; padding-left: 14px; }
          .vm-tool b { font-size: 17px; margin-right: 8px; }
          .vm-other { right: 10px; bottom: 5px; height: 46px; padding: 0 14px; }
          .vm-bottom {
            height: 88px; padding: 10px 8px calc(10px + var(--vm-safe));
            border-radius: 22px 22px 0 0;
            grid-template-columns: 1fr 1fr 1.15fr 1.18fr;
          }
          .vm-metric { gap: 6px; padding: 0 7px; }
          .vm-metric-icon { width: 30px; height: 30px; flex-basis: 30px; font-size: 15px; }
          .vm-metric b { font-size: 14px; }
          .vm-metric small { font-size: 8px; }
          .vm-review { margin-left: 7px; border-radius: 14px; font-size: 11px; }
          .vm-tag { font-size: 9px; padding: 4px 10px; }
          .vm-mark { width: 24px; height: 24px; }
        }
      `}</style>

      <div className="vm-app">
        {/* Cabeçalho */}
        <header className="vm-head">
          <div className="vm-headbox">
            <button className="vm-back" onClick={() => router.back()}>←</button>
            <div className="vm-title">
              <b>{vehicleLabel}</b>
              <span>見積書 — {operationLabel}</span>
            </div>
            <div className="vm-saved">
              <i>✓</i>{isPending ? 'Salvando…' : 'Salvo'}
            </div>
          </div>
        </header>

        {/* Etapas */}
        <div className="vm-flow">
          {['Rascunho', 'Revisão', 'Aprovado', 'Emitido', 'Enviado'].map((step, i) => (
            <div
              key={step}
              className={`vm-step${i === 0 ? ' active' : ''}`}
            >
              {step}
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="vm-legend">
          <div className="vm-key"><i className="vm-sw"></i>Não avaliado</div>
          <div className="vm-key"><i className="vm-sw ok"></i>Sem dano</div>
          <div className="vm-key"><i className="vm-sw light"></i>Dano leve</div>
          <div className="vm-key"><i className="vm-sw severe"></i>Dano médio/grave</div>
          <div className="vm-key"><i className="vm-sw na"></i>N/A</div>
        </div>

        {/* Vistas (decorativo por enquanto) */}
        <div className="vm-view-row">
          <button className="vm-views"><span>▰</span> Vistas <b>⌄</b></button>
        </div>

        {/* Estágio do veículo */}
        <section className="vm-stage">
          <div
            className="vm-vehicle"
            style={{ '--vm-zoom': zoom } as React.CSSProperties}
          >
            {/* Foto do carro */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="vm-car-photo"
              src="/vehiclemap_car_topdown.png"
              alt="Veículo visto de cima"
            />

            {/* Zonas SVG */}
            <svg
              className="vm-zones"
              viewBox="0 0 1024 1536"
              aria-label="Peças avaliáveis do veículo"
            >
              {PANELS.map(panel => {
                const pState = panels[panel.id]?.state ?? 'none'
                return (
                  <path
                    key={panel.id}
                    className={`vm-zone${activeId === panel.id ? ' selected' : ''}`}
                    data-id={panel.id}
                    data-state={pState === 'none' ? undefined : pState}
                    d={panel.svgPath}
                    onClick={() => openSheet(panel.id)}
                  />
                )
              })}
            </svg>

            {/* Marcadores */}
            {PANELS.map(panel => {
              const pData = panels[panel.id]
              const pState = pData?.state ?? 'none'
              const hasPrice = pData?.price > 0

              // Posições: desktop vs mobile usam CSS classes
              // Usamos variáveis CSS para desktop, @media para mobile
              return (
                <button
                  key={panel.id}
                  className={`vm-mark${panel.tagLeft ? ' tag-left' : ''}${activeId === panel.id ? ' selected' : ''}`}
                  data-id={panel.id}
                  data-state={pState === 'none' ? undefined : pState}
                  style={{
                    left: `var(--mark-${panel.id}-dx, ${panel.dx}px)`,
                    top: `var(--mark-${panel.id}-dy, ${panel.dy}px)`,
                  }}
                  onClick={() => openSheet(panel.id)}
                >
                  {pState === 'ok' ? '✓' : ''}
                  {hasPrice && pState !== 'ok' && (
                    <span className="vm-tag">
                      ¥{Math.round((pData?.price ?? 0) / 1000)}k
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Controles laterais */}
          <div className="vm-side-tools">
            <button
              className="vm-tool"
              onClick={() => setZoom(z => z === 1 ? 1.15 : (z === 1.15 ? 0.88 : 1))}
            >
              <b>⌖</b>Zoom
            </button>
            <button className="vm-tool" onClick={() => setZoom(1)}>
              <b>↶</b>Resetar
            </button>
          </div>

          <button className="vm-other" onClick={handleOtherPanel}>
            <b>＋</b>Outra peça
          </button>
        </section>
      </div>

      {/* Barra inferior */}
      <footer className="vm-bottom">
        <div className="vm-metric">
          <div className="vm-metric-icon">✓</div>
          <div>
            <b>{evaluated} / {PANELS.length}</b>
            <small>avaliados</small>
          </div>
        </div>
        <div className="vm-metric">
          <div className="vm-metric-icon gray">◌</div>
          <div>
            <b>{remaining}</b>
            <small>restantes</small>
          </div>
        </div>
        <div className="vm-metric total">
          <div className="vm-metric-icon yen">¥</div>
          <div>
            <b>{fmtPrice(total)}</b>
            <small>parcial</small>
          </div>
        </div>
        <button className="vm-review" onClick={handleReview}>
          Revisar →
        </button>
      </footer>

      {/* Scrim */}
      <div
        className={`vm-scrim${activeId ? ' open' : ''}`}
        onClick={closeSheet}
      />

      {/* Bottom sheet de avaliação */}
      <aside className={`vm-sheet${activeId ? ' open' : ''}`}>
        <div className="vm-handle" />
        <div className="vm-sheethead">
          <h2>{PANELS.find(p => p.id === activeId)?.name ?? '—'}</h2>
          <button className="vm-close" onClick={closeSheet}>×</button>
        </div>

        <div className="vm-states">
          {(['none', 'ok', 'light', 'severe'] as PanelState[]).map(s => (
            <button
              key={s}
              className={`vm-state${chosenState === s ? ' active' : ''}`}
              data-s={s}
              onClick={() => {
                setChosenState(s)
                if (s === 'none' || s === 'ok') setInputPrice('')
              }}
            >
              <i />
              {s === 'none' && 'Não avaliado'}
              {s === 'ok' && 'Sem dano'}
              {s === 'light' && 'Dano leve'}
              {s === 'severe' && 'Médio/grave'}
            </button>
          ))}
        </div>

        {(chosenState === 'light' || chosenState === 'severe') && (
          <label className="vm-price-row">
            ¥
            <input
              inputMode="numeric"
              placeholder="Valor (ex: 18 = ¥18k)"
              value={inputPrice}
              onChange={e => setInputPrice(e.target.value.replace(/\D/g, ''))}
            />
            k
          </label>
        )}

        <button className="vm-save" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Salvando…' : 'Salvar avaliação'}
        </button>
      </aside>

      {/* Toast */}
      <div className={`vm-toast${toast ? ' show' : ''}`}>{toast}</div>

      {/* CSS overrides para posições de marcadores via CSS vars — abordagem simples */}
      <style>{`
        /* Cada marcador tem posição absoluta via style inline,
           mas precisamos override para mobile via @media */
        @media (max-width: 560px) {
          .vm-mark:nth-child(1)  { left: 195px !important; top: 114px !important; }
          .vm-mark:nth-child(2)  { left: 88px !important;  top: 128px !important; }
          .vm-mark:nth-child(3)  { left: 302px !important; top: 128px !important; }
          .vm-mark:nth-child(4)  { left: 87px !important;  top: 247px !important; }
          .vm-mark:nth-child(5)  { left: 87px !important;  top: 320px !important; }
          .vm-mark:nth-child(6)  { left: 303px !important; top: 247px !important; }
          .vm-mark:nth-child(7)  { left: 303px !important; top: 320px !important; }
          .vm-mark:nth-child(8)  { left: 195px !important; top: 332px !important; }
          .vm-mark:nth-child(9)  { left: 87px !important;  top: 437px !important; }
          .vm-mark:nth-child(10) { left: 303px !important; top: 437px !important; }
          .vm-mark:nth-child(11) { left: 195px !important; top: 474px !important; }
          .vm-mark:nth-child(12) { left: 195px !important; top: 538px !important; }
        }
      `}</style>
    </>
  )
}
