import { router } from 'expo-router';
import { View, Text, Button } from 'react-native';

export default function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>这里是详情页</Text>
      <Button title="返回上一页" onPress={() => router.back()} />
      <Button title="跳转到设置页" onPress={() => router.navigate('/settings')} /> 
    </View>
  );
}