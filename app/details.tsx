import { View, Text, Button } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

export default function DetailsScreen() {
  const params = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen
        options={{
          // 使用路由参数来配置 Header Bar
          title: params.title as string,
          // Header Bar 样式修改
          headerStyle: { backgroundColor: '#e29447' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Text>这里是详情页</Text>
      <Text>你传过来的id是: {params.id}</Text>
      <Text>你传过来的title是: {params.title}</Text>

      <Button
        title="修改标题"
        // 使用 js 代码动态变更标题
        onPress={() => router.setParams({ title: '标题更新了!' })}
      />
      
      <Button title="返回上一页" onPress={() => router.back()} />
      <Button title="跳转到设置页" onPress={() => router.navigate('/settings')} /> 
    </View>
  );
}