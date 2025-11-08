// src/screens/NotesHighlightsSummary.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { fetchChapterText, fetchChapterSummary, fetchAdvancedChapterSummary } from '../services/scripture';
import { colors } from '../theme/colors';

type Entry = {
  id: string; book_name: string; chapter_number: number;
  context_type: 'verse' | 'summary' | string | null; context_key: string | null;
  entry_type: 'note' | 'highlight'; note_markdown?: string | null;
  highlight_color?: 'yellow' | 'green' | 'pink' | 'blue' | null;
  study_tier?: 'basic' | 'advanced' | null; created_at: string;
};

const slugify = (s?: string) => String(s ?? '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
const splitBlocks = (md?: string | null) => {
  const src = String(md ?? ''); if (!src.trim()) return [];
  const lines = src.split('\n'); const out: string[] = []; let buf: string[] = []; let code = false;
  const flush = () => { const t = buf.join('\n').trim(); if (t) out.push(t); buf = [] };
  for (const line of lines) { if (line.trim().startsWith('```')) { code = !code; buf.push(line); continue; }
    if (!code && line.trim() === '') flush(); else buf.push(line); }
  flush(); return out;
};
const parseCtx = (ck?: string | null) => {
  const s = String(ck ?? '');
  if (s.startsWith('v:')) { const n = parseInt(s.slice(2), 10); return { kind: 'verse' as const, verse: isFinite(n) ? n : null }; }
  const pTier = s.match(/^p:(basic|advanced):([^:]+):(\d+)$/); if (pTier) return { kind: 'para' as const, tier: pTier[1] as 'basic'|'advanced', slug: pTier[2], idx: Number(pTier[3]) };
  const sTier = s.match(/^s:(basic|advanced):([^:]+)$/); if (sTier) return { kind: 'section' as const, tier: sTier[1] as 'basic'|'advanced', slug: sTier[2] };
  const pLegacy = s.match(/^p:([^:]+):(\d+)$/); if (pLegacy) return { kind: 'para' as const, slug: pLegacy[1], idx: Number(pLegacy[2]) };
  if (s.startsWith('s:')) return { kind: 'section' as const, slug: s.slice(2) || 'summary' };
  return { kind: 'unknown' as const };
};
async function getSummaryParagraphText(bookName: string, chapterNum: number, slug: string, idx: number | null, tier?: 'basic'|'advanced'|null) {
  const { data: b } = await supabase.from('bible_books').select('id').eq('book_name', bookName).maybeSingle();
  if (!b?.id) return null;
  if (tier === 'basic') {
    const basic = await fetchChapterSummary(b.id, chapterNum);
    if (!basic?.summary_content || slug !== 'summary' || idx == null) return null;
    return splitBlocks(String(basic.summary_content))[idx] ?? null;
  }
  const adv = await fetchAdvancedChapterSummary(b.id, chapterNum);
  const raw = adv?.summary_advanced; let sections: { title: string; body: string }[] = [];
  if (typeof raw === 'string') sections = [{ title: 'Summary', body: raw }];
  else if (Array.isArray(raw)) sections = raw.map((r: any) => ({ title: r?.title || r?.section || 'Section', body: String(r?.content || r?.body || '') }));
  else if (raw && typeof raw === 'object') sections = Object.entries(raw).map(([k, v]) => ({ title: String(k), body: String(v ?? '') }));
  else if (adv?.summary_content) sections = [{ title: 'Summary', body: String(adv.summary_content) }];
  const sec = sections.find(s => slugify(s.title) === slug); if (!sec) return null;
  if (idx == null) return sec.body;
  return splitBlocks(sec.body)[idx] ?? null;
}

export default function NotesHighlightsSummary() {
  const [loading, setLoading] = useState(true);
  const [verses, setVerses] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [modal, setModal] = useState<{ open: boolean; title: string; body: string }>({ open: false, title: '', body: '' });

  const openModal = useCallback((title: string, body: string) => setModal({ open: true, title, body }), []);
  const closeModal = useCallback(() => setModal({ open: false, title: '', body: '' }), []);

  useEffect(() => { (async () => {
    try {
      const { data: auth } = await supabase.auth.getUser(); const userId = auth?.user?.id;
      if (!userId) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('user_chapter_entries')
        .select('id,book_name,chapter_number,context_type,context_key,entry_type,note_markdown,highlight_color,study_tier,created_at')
        .eq('user_id', userId)
        .in('entry_type', ['note','highlight'])
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const entries = (data ?? []) as Entry[]; const versesOut: any[] = []; const summariesOut: any[] = [];
      for (const e of entries) {
        if (e.context_type === 'verse') {
          const ctx = parseCtx(e.context_key);
          const label = `${e.book_name} ${e.chapter_number}${ctx.kind==='verse' && ctx.verse ? ':'+ctx.verse : ''}`;
          if (e.entry_type === 'note') {
            versesOut.push({ id:e.id, label, type:'note', text:e.note_markdown ?? undefined, created_at:e.created_at });
          } else {
            try {
              const { data: b } = await supabase.from('bible_books').select('id').eq('book_name', e.book_name).maybeSingle();
              const vlist = await fetchChapterText(b?.id as number, e.chapter_number);
              const verseObj = Array.isArray(vlist) ? vlist.find((rv: any) => Number(rv?.number ?? rv?.verse ?? rv?.verse_number) === (ctx as any).verse) : null;
              versesOut.push({ id:e.id, label, type:'highlight', text: verseObj?.text ?? undefined, created_at:e.created_at });
            } catch { versesOut.push({ id:e.id, label, type:'highlight', created_at:e.created_at }); }
          }
        } else {
          const ctx = parseCtx(e.context_key);
          const secLabel =
            ctx.kind==='para' ? `${e.book_name} ${e.chapter_number} • ${ctx.slug} p.${(ctx.idx ?? 0)+1} ${ctx.tier ?? ''}`.trim()
          : ctx.kind==='section' ? `${e.book_name} ${e.chapter_number} • ${ctx.slug} ${ctx.tier ?? ''}`.trim()
          : `${e.book_name} ${e.chapter_number} • summary`;
          if (e.entry_type === 'note') {
            summariesOut.push({ id:e.id, label:secLabel, type:'note', text:e.note_markdown ?? undefined, created_at:e.created_at });
          } else {
            try {
              let paragraph: string | null = null;
              if (ctx.kind==='para') paragraph = await getSummaryParagraphText(e.book_name, e.chapter_number, String(ctx.slug), ctx.idx ?? null, ctx.tier ?? e.study_tier ?? undefined);
              else if (ctx.kind==='section') paragraph = await getSummaryParagraphText(e.book_name, e.chapter_number, String(ctx.slug), 0, ctx.tier ?? e.study_tier ?? undefined);
              summariesOut.push({ id:e.id, label:secLabel, type:'highlight', text: paragraph ?? undefined, created_at:e.created_at });
            } catch { summariesOut.push({ id:e.id, label:secLabel, type:'highlight', created_at:e.created_at }); }
          }
        }
      }
      setVerses(versesOut); setSummaries(summariesOut);
    } catch (e) { console.warn('[NotesHighlightsSummary] load error:', e); }
    finally { setLoading(false); }
  })(); }, []);

  const colorForType = useCallback((t: 'note'|'highlight') => (t==='note' ? colors.accent.secondary : colors.accent.tertiary), []);
  const Empty = useMemo(() => <Text style={s.muted}>Nothing yet.</Text>, []);
  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accent.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h}>Verses</Text>
      {verses.length===0 ? Empty : verses.map(v => (
        <TouchableOpacity key={v.id} onPress={() => openModal(v.label, v.text ?? '')}>
          <View style={s.card}>
            <View style={s.row}><Text style={s.title}>{v.label}</Text><Text style={[s.badge,{backgroundColor:colorForType(v.type)}]}>{v.type}</Text></View>
            {v.text ? <Text style={s.body} numberOfLines={3}>{v.text}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}

      <Text style={[s.h,{marginTop:20}]}>Summaries</Text>
      {summaries.length===0 ? Empty : summaries.map(v => (
        <TouchableOpacity key={v.id} onPress={() => openModal(v.label, v.text ?? '')}>
          <View style={s.card}>
            <View style={s.row}><Text style={s.title}>{v.label}</Text><Text style={[s.badge,{backgroundColor:colorForType(v.type)}]}>{v.type}</Text></View>
            {v.text ? <Text style={s.body} numberOfLines={4}>{v.text}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}

      <Modal visible={modal.open} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={s.backdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{modal.title}</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={s.modalBody}>{modal.body || '(No preview available)'}</Text>
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={closeModal}><Text style={s.btnGhostText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap:{ padding:12, paddingBottom:40, backgroundColor: colors.background.primary },
  center:{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: colors.background.primary },
  h:{ fontWeight:'800', color: colors.text.primary, marginBottom:8, fontSize:16 },
  muted:{ color: colors.text.muted },
  card:{ backgroundColor: colors.background.tertiary, borderWidth:1, borderColor: colors.border.default, borderRadius:12, padding:12, marginBottom:10 },
  row:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  title:{ fontWeight:'700', color: colors.text.primary, marginBottom:6, flex:1, marginRight:8 },
  body:{ color: colors.text.secondary },
  badge:{ color: colors.text.primary, fontWeight:'800', fontSize:12, paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  backdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.75)', alignItems:'center', justifyContent:'center' },
  modalCard:{ width:'92%', backgroundColor: colors.background.elevated, borderRadius:12, padding:14 },
  modalTitle:{ fontSize:16, fontWeight:'800', marginBottom:10, color: colors.text.primary },
  modalBody:{ color: colors.text.secondary, lineHeight:20 },
  btn:{ backgroundColor: colors.accent.primary, borderRadius:10, paddingHorizontal:16, paddingVertical:10, marginTop:10 },
  btnGhost:{ backgroundColor: colors.background.tertiary },
  btnGhostText:{ color: colors.text.primary, fontWeight:'800' },
});
