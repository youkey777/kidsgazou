import { motion } from 'framer-motion'
import {
  AFFINITY_LEVELS,
  ATTRIBUTES,
  attributeAffinity,
  attributeMark,
  type AttributeAffinityRank,
} from './character-rules'

const BG = '/battle/attribute-chart-bg.png'

const RANK_STYLES: Record<AttributeAffinityRank, string> = {
  3: 'bg-red-400 text-white shadow-red-300/60',
  2: 'bg-orange-300 text-zinc-950 shadow-orange-300/50',
  1: 'bg-yellow-200 text-zinc-950 shadow-yellow-200/50',
  0: 'bg-white/25 text-white shadow-white/20',
  [-1]: 'bg-sky-200 text-sky-950 shadow-sky-200/40',
  [-2]: 'bg-blue-400 text-white shadow-blue-300/50',
  [-3]: 'bg-indigo-700 text-white shadow-indigo-400/50',
}

const RANKS: AttributeAffinityRank[] = [3, 2, 1, 0, -1, -2, -3]

export default function AttributeGuide() {
  return (
    <section
      className="-mx-3 min-h-[calc(100vh-116px)] overflow-hidden bg-purple-950 px-3 py-4 text-white sm:-mx-4 sm:px-4"
      style={{
        backgroundImage: `linear-gradient(rgba(16,5,37,.2),rgba(16,5,37,.82)), url(${BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <motion.div
        className="mx-auto max-w-md space-y-3"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="rounded-[2rem] bg-black/45 p-4 shadow-2xl ring-1 ring-white/20 backdrop-blur">
          <p className="text-xs font-black text-cyan-100">バトルのひみつ</p>
          <h2 className="mt-1 text-2xl font-black text-yellow-200">属性(ぞくせい) 相性表(あいしょうひょう)</h2>
          <p className="mt-2 text-sm font-bold text-white/85">
            攻撃(こうげき)する属性(ぞくせい)と、相手(あいて)の属性(ぞくせい)でダメージが変(か)わります。
            同(おな)じ属性(ぞくせい)は表(ひょう)から外(はず)しています。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {RANKS.map((rank) => (
              <div
                key={rank}
                className={`rounded-2xl px-3 py-2 text-center text-xs font-black shadow-lg ${RANK_STYLES[rank]}`}
              >
                {AFFINITY_LEVELS[rank].label} x{AFFINITY_LEVELS[rank].multiplier}
              </div>
            ))}
        </div>

        <div className="space-y-3">
          {ATTRIBUTES.map((source, sourceIndex) => (
            <motion.div
              key={source}
              className="rounded-[1.7rem] bg-white/12 p-3 shadow-xl ring-1 ring-white/18 backdrop-blur"
              initial={{ opacity: 0, x: sourceIndex % 2 === 0 ? -18 : 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-200 text-2xl shadow-[0_0_20px_rgba(250,204,21,.55)]">
                  {attributeMark(source)}
                </span>
                <div>
                  <p className="text-lg font-black text-white">{source}</p>
                  <p className="text-xs font-bold text-white/65">この属性(ぞくせい)で攻撃(こうげき)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ATTRIBUTES.filter((target) => target !== source).map((target) => {
                  const affinity = attributeAffinity(source, target)
                  return (
                    <div
                      key={target}
                      className={`rounded-2xl px-2 py-2 text-xs font-black shadow-md ${RANK_STYLES[affinity.rank]}`}
                    >
                      <span className="mr-1">{attributeMark(target)}</span>
                      {target}
                      <span className="ml-1 opacity-85">{affinity.shortLabel}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
