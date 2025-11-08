// CharactersHomeScreen.tsx — list with search & filter
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listCharacters } from '../../lib/characters';
import type { BibleCharacter } from '../../types/supabase-characters';


export default function CharactersHomeScreen() {
const [items, setItems] = useState<BibleCharacter[]>([]);
const [q, setQ] = useState('');
const [testament, setTestament] = useState<'OT'|'NT'|null>(null);
const [loading, setLoading] = useState(true);
const navigation = useNavigation<any>();


const load = async () => {
setLoading(true);
try { setItems(await listCharacters({ q: q || null, testament })); }
finally { setLoading(false); }
};


useFocusEffect(useCallback(() => { load(); }, [q, testament]));


if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>;


return (
<View style={{ flex:1 }}>
<View style={{ padding:12, flexDirection:'row', gap:8 }}>
<TextInput
placeholder="Search characters"
value={q}
onChangeText={setQ}
style={{ flex:1, paddingHorizontal:12, paddingVertical:10, borderWidth:1, borderColor:'#e5e7eb', borderRadius:10 }}
/>
<Pressable onPress={() => setTestament(testament === 'OT' ? null : 'OT')} style={{ paddingHorizontal:12, justifyContent:'center', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10 }}>
<Text>{testament === 'OT' ? 'All' : 'OT'}</Text>
</Pressable>
<Pressable onPress={() => setTestament(testament === 'NT' ? null : 'NT')} style={{ paddingHorizontal:12, justifyContent:'center', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10 }}>
<Text>{testament === 'NT' ? 'All' : 'NT'}</Text>
</Pressable>
</View>
<FlatList
data={items}
keyExtractor={(c) => String(c.id)}
renderItem={({ item }) => (
<Pressable onPress={() => navigation.navigate('CharacterDetail', { id: item.id })} style={{ padding:16, borderBottomWidth:1, borderBottomColor:'#eee' }}>
<Text style={{ fontSize:16, fontWeight:'700' }}>{item.name}</Text>
<Text style={{ marginTop:4, fontSize:12, color:'#6b7280' }}>{item.character_type ?? ''} {item.testament ? `• ${item.testament}` : ''} {item.total_lessons ? `• ${item.total_lessons} lessons` : ''}</Text>
{item.one_sentence_summary ? <Text style={{ marginTop:6, fontSize:13, color:'#374151' }}>{item.one_sentence_summary}</Text> : null}
</Pressable>
)}
/>
</View>
);
}