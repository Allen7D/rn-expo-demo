import { View, Text, Button } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function DetailsScreen() {
  const { id, title } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>这里是详情页</Text>
      <Text>你传过来的id是: {id}</Text>
      <Text>你传过来的title是: {title}</Text>
      
      <Button title="返回上一页" onPress={() => router.back()} />
      <Button title="跳转到设置页" onPress={() => router.navigate('/settings')} /> 
    </View>
  );
}