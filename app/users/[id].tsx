import { View, Image, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

/**
 * 自定义组件，设置 Header Bar
 * @param props 可以获取 Header Bar 样式（包括父级配置的）
 * @returns 
 */
function AvatarTitle(props: any) {
  console.log('AvatarTitle props:', props);
  return (<View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Image style={{ width: 30, height: 30 }} source={{ uri: 'https://docs.expo.dev/static/images/favicon.ico' }} />
    <Text>{props.children}</Text>
  </View>)
}

export default function UsersScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen
        options={{
          title: `用户${id}`, // title 可以作为 children 传入，如果不写则默认为页面路径
          headerTitle: AvatarTitle,
        }}
      />
      <Text>这里是用户页</Text>
      <Text>你传过来的id是: {id}</Text>
    </View>
  );
}