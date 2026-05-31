import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchPublicMerchants } from '../../../src/services/coreApi';
import type { CoreMerchantRecord } from '../../../src/core/types/core';
import { getRecentActivities, ScanActivityRow } from '../../../src/services/supabase';

const AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfwTwVKPvzjkp97g3Ijiob9G5BaaDP9jXedKu-2ZCZurHjbEdTG3xwi0ogFq2679xZIuSZKiESRzOSP63s9aJ7jO1CPlgui_xBReyWT8jsGkJZTdtqlSN0DANV51Rfm4S2g0tYaZlMhcFqf_DESevWT3higRZVR9zTrvbETb-LjZfsiq6u0kYlo1JhrNn2VxXrLhiAJFn6wltiyHp6zygdCZ-Xl1-tjsnjEAg_198b9oh7MyOPh_JbEgm-kw_-O23akgdmVLGfnvOC';

const FALLBACK_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCYcHw7o3a88f-pfrfPRj-UAwnBAJVTZiAASv0nhFWzJL_NIwIQfLNiodsak6xLiEk1YGchwjD1hEDzoZwe1tFEp6Ya8D3N439Ql1Q5juTgfhBwam6l3nFnq2Ck-MShn6rkyhE6cEtWcf_9K8zqbsyVxyoZqAggkUwSdWPAnUeCh-I42FW81w4KJ1v4KYbjs26jrCqLQiRc5tvUnda3vbmQP1uFUxo0Dg8BBUnd-fF-G4tcUUunr6m-7sq7841rR1RfDkEVy6Hb2qhq',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCsGtNGqZNcChmaR893OWkFSlBBHMTRBFWwr-hK6bh9VvM0B5zQcwQfqGyuIZNVRHti0IwHI0GcWS0eMx7FfCUMdU4rz9aZuaBCKjFbQ19oJ3ZsxzPsKiQEsU6wvV5c9TWN_4o5JEEeQLv_yHUAhsNTdSdDkvlnfnEnFS794reuWmfpDdyIoQ2zDH10eRJUQXQDgp_vjKXlSciWn_eL9wYF81BmvsuDVt4z4P0fKlMKLE1uBBEGMKycqXOYx4vKxepQmMkHAxNp1nG0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCi_KKQmxOUa6vIWNTuy3LJqlHcghloiTqArelOI11OyAHJl1zxBLWBy-baqE7i-7ct24l8dvaWepSzheU1fKf_re1W7MYanCu9osWNlKfol-8psSEiLqLlu0hwW_wWt_LWgzR4iYDPRRZxixX1xdgeupboOjwFGt_bsIy0fivFVKgM-WJn53FCFtgZAEuyeg5T256eI38PjCMkMrvSBedegxoVk7vqfF2G2yZCnqZVNX0PBEkKqthRltvwLX54DHdWJiRuRYcIRoMa',
];

function inferCategory(name: string, raw?: string): string {
  const s = `${raw ?? ''} ${name}`.toLowerCase();
  if (/nasi|warung|sate|mie|bakso|food|kuliner|kopi|soto|pizza|es |goreng/.test(s)) return 'Street Food';
  if (/retail|kelontong|mart|toko|grocery|sembako/.test(s)) return 'Retail';
  if (/service|laundry|bengkel|jasa|tambal/.test(s)) return 'Services';
  return 'Local Merchant';
}

export default function ContributePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CoreMerchantRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<ScanActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchPublicMerchants();
      if (!active) return;
      setRows(data);
      setLoading(false);
    })();

    getRecentActivities(5).then(data => {
      if (active) {
        setRecentActivities(data);
        setLoadingActivities(false);
      }
    });

    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const verified = rows.filter((r) => r.status === 'VERIFIED_INVISIBLE' || r.status === 'INVISIBLE').length;
    const scanSum = rows.reduce((sum, r) => sum + r.scanCount, 0);
    return { total, verified, scanSum, impactScore: Math.round(scanSum * 2.3 + verified * 15) };
  }, [rows]);

  const saved = useMemo(() => rows.filter(r => r.status === 'VERIFIED_INVISIBLE').slice(0, 5), [rows]);
  const recent = useMemo(() => [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [rows]);

  return (
    <div className="min-h-[100dvh] bg-background pb-24 pt-16 text-on-background">
      <main className="mx-auto w-full max-w-lg space-y-5 px-4 pt-4">
        {/* Profile Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
        >
          <div className="relative">
            <img src={AVATAR} alt="Profile" className="h-24 w-24 rounded-full border-4 border-primary object-cover" referrerPolicy="no-referrer" />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
              <span className="material-symbols-outlined text-[16px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
          <h2 className="mt-3 text-xl font-bold text-on-surface">Indra Mapping</h2>
          <p className="text-sm text-on-surface-variant">Field Contributor • Level 12</p>
        </motion.section>

        {/* Community Impact Score */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-primary p-6 text-on-primary shadow-lg"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Community Impact Score</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-4xl font-bold">{loading ? '...' : stats.impactScore.toLocaleString()}</p>
            <span className="material-symbols-outlined text-[24px] text-primary-fixed">trending_up</span>
          </div>
          <p className="mt-2 text-sm leading-snug opacity-90">
            You have supported {stats.verified} informal vendors this month. Your mapping helped {Math.round(stats.verified * 0.7)} new stalls gain visibility.
          </p>
          <div className="absolute -bottom-6 -right-6 rotate-12 opacity-10">
            <span className="material-symbols-outlined !text-[120px]">tag</span>
          </div>
        </motion.section>

        {/* Community Badges */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-on-surface">Community Badges</h3>
            <button className="text-sm font-semibold text-primary">View All</button>
          </div>
          <div className="mt-3 flex justify-around">
            {[
              { icon: 'explore', label: 'Street Hero', bg: 'bg-zinc-800', color: 'text-white' },
              { icon: 'star', label: 'Top Scout', bg: 'bg-amber-400', color: 'text-white' },
              { icon: 'diamond', label: 'Patron', bg: 'bg-primary', color: 'text-white' },
            ].map(b => (
              <div key={b.label} className="flex flex-col items-center gap-1">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${b.bg} ${b.color} shadow`}>
                  <span className="material-symbols-outlined text-[28px]">{b.icon}</span>
                </div>
                <span className="text-xs font-semibold text-on-surface-variant">{b.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Stalls */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-on-surface">Saved Stalls</h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{saved.length} Saved</span>
          </div>
          {saved.length > 0 && (
            <div className="mt-3 space-y-3">
              {/* Featured saved */}
              <div
                onClick={() => navigate(`/merchant/${saved[0].id}`)}
                className="relative h-48 cursor-pointer overflow-hidden rounded-2xl shadow-md"
              >
                <img
                  src={saved[0].imageUrl || FALLBACK_IMAGES[0]}
                  alt={saved[0].name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="mb-1 inline-block rounded bg-tertiary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-tertiary-container">
                    {inferCategory(saved[0].name, saved[0].category)}
                  </span>
                  <h4 className="text-lg font-bold text-white">{saved[0].name}</h4>
                  <p className="flex items-center gap-1 text-xs text-white/80">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {saved[0].city}
                  </p>
                </div>
                <button className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                  <span className="material-symbols-outlined">bookmark</span>
                </button>
              </div>

              {/* Grid of saved stalls */}
              {saved.length > 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {saved.slice(1, 3).map((r, i) => (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/merchant/${r.id}`)}
                      className="cursor-pointer overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
                    >
                      <div className="h-24">
                        <img src={r.imageUrl || FALLBACK_IMAGES[i + 1]} alt={r.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-sm font-semibold text-on-surface">{r.name}</p>
                        <div className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          {(3.8 + r.confidence / 100).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Recent Activities */}
        <section>
          <h3 className="mb-3 text-lg font-bold text-on-surface">Aktivitas Pemetaan Terbaru</h3>
          {loadingActivities ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl border border-outline-variant bg-surface-container-lowest" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-4">Belum ada aktivitas scan QRIS yang tercatat.</p>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => navigate(`/map?lat=${act.lat}&lng=${act.lng}`)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-3 transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary">
                      <span className="material-symbols-outlined text-[20px]">
                        {act.merchant_category?.toLowerCase().includes('food') ? 'restaurant' : act.merchant_category?.toLowerCase().includes('service') ? 'handyman' : 'storefront'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface leading-tight">{act.merchant_name}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">
                        {act.merchant_city || 'Indonesia'} • {new Date(act.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • NMID: {act.nmid}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded bg-primary/10 text-primary">
                      {act.result_status || 'SCANNED'}
                    </span>
                    <span className="text-[8px] text-on-surface-variant font-mono">
                      Conf: {act.result_confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
