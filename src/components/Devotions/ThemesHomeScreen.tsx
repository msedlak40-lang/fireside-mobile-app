// src/screens/Devotions/ThemesHomeScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listThemeCategories } from '../../lib/devotions';


export default function ThemesHomeScreen() {
const [cats, setCats] = useState<{ theme_category: string; count: number }[]>([]);
const [loading, setLoading] = useState(true);
const navigation = useNavigation<any>();


const load = async () => {
setLoading(true);
try { setCats(await listThemeCategories()); } finally { setLoading(false); }
};
useFocusEffect(useCallback(() => { load(); }, []));


if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>;


return (
<FlatList
data={cats}
numColumns={2}
keyExtractor={(x) => x.theme_category}
columnWrapperStyle={{ gap:12, paddingHorizontal:12 }}
contentContainerStyle={{ gap:12, paddingVertical:12, paddingBottom:24 }}
renderItem={({ item }) => (
<Pressable onPress={() => navigation.navigate('ThemeList', { category: item.theme_category })} style={{ flex:1, padding:16, borderWidth:1, borderColor:'#e5e7eb', borderRadius:12, backgroundColor:'white' }}>
<Text style={{ fontSize:16, fontWeight:'700' }}>{item.theme_category}</Text>
<Text style={{ marginTop:6, fontSize:12, color:'#6b7280' }}>{item.count} devotions</Text>
</Pressable>
)}
/>
);
}