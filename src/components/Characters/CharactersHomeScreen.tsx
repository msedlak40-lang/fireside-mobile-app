// CharactersHomeScreen.tsx — list with search & filter
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listCharacters } from '../../lib/characters';
import { fetchActiveCharacterStudy } from '../../services/progress';
import { colors } from '../../theme/colors';
import type { BibleCharacter } from '../../types/supabase-characters';
import type { ActiveCharacterStudy } from '../../services/progress';


export default function CharactersHomeScreen() {
const [items, setItems] = useState<BibleCharacter[]>([]);
const [activeStudy, setActiveStudy] = useState<ActiveCharacterStudy | null>(null);
const [q, setQ] = useState('');
const [testament, setTestament] = useState<'OT'|'NT'|null>(null);
const [loading, setLoading] = useState(true);
const navigation = useNavigation<any>();


const load = async () => {
setLoading(true);
try {
const [charactersData, activeData] = await Promise.all([
listCharacters({ q: q || null, testament }),
fetchActiveCharacterStudy()
]);
setItems(charactersData);
setActiveStudy(activeData);
} catch (err) {
console.error('[CharactersHome] Load failed', err);
}
finally { setLoading(false); }
};


useFocusEffect(useCallback(() => { load(); }, [q, testament]));


if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: colors.background.primary }}><ActivityIndicator color={colors.accent.primary} /></View>;


return (
<View style={{ flex:1, backgroundColor: colors.background.primary }}>
<FlatList
ListHeaderComponent={
<>
{/* Active Study Card */}
{activeStudy ? (
<Pressable
onPress={() => navigation.navigate('CharacterDetail', { id: activeStudy.character_id })}
style={{
margin: 16,
padding: 16,
backgroundColor: '#dbeafe',
borderRadius: 12,
borderWidth: 2,
borderColor: colors.accent.primary
}}
>
<Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '700' }}>ACTIVE CHARACTER STUDY</Text>
<Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, color: '#1e40af' }}>{activeStudy.character_name}</Text>
{activeStudy.character_type && (
<Text style={{ marginTop: 4, fontSize: 13, color: '#1e40af' }}>
{activeStudy.character_type} {activeStudy.testament ? `• ${activeStudy.testament}` : ''}
</Text>
)}
<View style={{ marginTop: 8, flexDirection: 'row', gap: 12 }}>
<Text style={{ fontSize: 14, color: '#1e40af' }}>
{activeStudy.completed_lessons}/{activeStudy.total_lessons} lessons
</Text>
<Text style={{ fontSize: 14, color: '#1e40af' }}>•</Text>
<Text style={{ fontSize: 14, color: '#1e40af' }}>
{activeStudy.percentage}% complete
</Text>
</View>
</Pressable>
) : (
<View style={{ margin: 16, padding: 16, backgroundColor: colors.background.secondary, borderRadius: 12 }}>
<Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>No Active Character Study</Text>
<Text style={{ marginTop: 4, fontSize: 14, color: colors.text.secondary }}>
Choose a character below to get started!
</Text>
</View>
)}

{/* Search & Filter */}
<View style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection:'row', gap:8 }}>
<TextInput
placeholder="Search characters"
placeholderTextColor={colors.text.tertiary}
value={q}
onChangeText={setQ}
style={{ flex:1, paddingHorizontal:12, paddingVertical:10, borderWidth:1, borderColor: colors.border.default, borderRadius:10, backgroundColor: colors.background.secondary, color: colors.text.primary }}
/>
<Pressable onPress={() => setTestament(testament === 'OT' ? null : 'OT')} style={{ paddingHorizontal:12, justifyContent:'center', borderWidth:1, borderColor: colors.border.default, borderRadius:10, backgroundColor: testament === 'OT' ? colors.accent.primary : colors.background.secondary }}>
<Text style={{ color: testament === 'OT' ? colors.text.primary : colors.text.secondary }}>{testament === 'OT' ? 'All' : 'OT'}</Text>
</Pressable>
<Pressable onPress={() => setTestament(testament === 'NT' ? null : 'NT')} style={{ paddingHorizontal:12, justifyContent:'center', borderWidth:1, borderColor: colors.border.default, borderRadius:10, backgroundColor: testament === 'NT' ? colors.accent.primary : colors.background.secondary }}>
<Text style={{ color: testament === 'NT' ? colors.text.primary : colors.text.secondary }}>{testament === 'NT' ? 'All' : 'NT'}</Text>
</Pressable>
</View>

<View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
<Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>Browse Characters</Text>
</View>
</>
}
data={items}
keyExtractor={(c) => String(c.id)}
renderItem={({ item }) => (
<Pressable onPress={() => navigation.navigate('CharacterDetail', { id: item.id })} style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth:1, borderBottomColor: colors.border.default }}>
<Text style={{ fontSize:16, fontWeight:'700', color: colors.text.primary }}>{item.name}</Text>
<Text style={{ marginTop:4, fontSize:12, color: colors.text.secondary }}>{item.character_type ?? ''} {item.testament ? `• ${item.testament}` : ''} {item.total_lessons ? `• ${item.total_lessons} lessons` : ''}</Text>
{item.one_sentence_summary ? <Text style={{ marginTop:6, fontSize:13, color: colors.text.primary }}>{item.one_sentence_summary}</Text> : null}
</Pressable>
)}
contentContainerStyle={{ paddingBottom: 24 }}
/>
</View>
);
}