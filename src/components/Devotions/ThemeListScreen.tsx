// src/screens/Devotions/ThemeListScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { listDevotionsByTheme } from '../../lib/devotions';
import type { Devotion } from '../../types/supabase-devotions';


export default function ThemeListScreen() {
const { params } = useRoute<any>();
const navigation = useNavigation<any>();
const category = params?.category as string;
const [items, setItems] = useState<Devotion[]>([]);
const [loading, setLoading] = useState(true);


useEffect(() => { (async () => { try { setItems(await listDevotionsByTheme(category, 60)); } finally { setLoading(false); } })(); }, [category]);


if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>;


return (
<FlatList
data={items}
keyExtractor={(d) => String(d.id)}
renderItem={({ item }) => (
<Pressable onPress={() => navigation.navigate('DevotionDetail', { id: item.id })} style={{ padding:16, borderBottomWidth:1, borderBottomColor:'#eee' }}>
<Text style={{ fontSize:16, fontWeight:'600' }}>{item.title}</Text>
<Text style={{ marginTop:4, fontSize:13, color:'#6b7280' }}>{item.key_verse_reference}</Text>
{!!item.tags?.length && (
<View style={{ flexDirection:'row', flexWrap:'wrap', marginTop:8 }}>
{item.tags!.map((t) => (
<View key={t} style={{ paddingHorizontal:8, paddingVertical:2, backgroundColor:'#f1f5f9', borderRadius:9999, marginRight:6, marginBottom:6 }}>
<Text style={{ fontSize:12, color:'#334155' }}>#{t}</Text>
</View>
))}
</View>
)}
</Pressable>
)}
/>
);
}