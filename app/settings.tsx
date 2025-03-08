import { Button, View, Text } from "react-native";
import { StackActions } from "@react-navigation/native";
import { Stack, useNavigation } from "expo-router";
import { useState } from "react";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [count, setCount] = useState(0);

  const handlePopToTop = () => {
    const action = StackActions.popToTop();
    navigation.dispatch(action);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen
        options={{
          title: '自定义Title',
          headerLeft: () => (<Button title="弹框" onPress={() => alert('点击了弹框')} />),
          headerRight: () => (<Button title="计数器+1" onPress={() => setCount(count + 1)} />),
        }}
      />
      <Text>这里是设置页</Text>
      <Text>计数器: {count}</Text>
      <Button title="直接回到首页" onPress={handlePopToTop} />
    </View>
  )
}